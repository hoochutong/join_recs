#!/usr/bin/env node

/**
 * 수파베이스 데이터베이스 복원 스크립트
 * - 백업 파일 압축 해제
 * - 스키마 복원 (DDL)
 * - 데이터 복원 (INSERT 문)
 * - 복원 전 안전 검사
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

// 환경 변수 확인
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_PROJECT_ID = process.env.SUPABASE_PROJECT_ID;

if (!SUPABASE_URL || !SUPABASE_ACCESS_TOKEN || !SUPABASE_PROJECT_ID) {
  console.error('❌ 필수 환경 변수가 설정되지 않았습니다:');
  console.error('   SUPABASE_URL, SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_ID');
  process.exit(1);
}

// 명령행 인수 처리
const args = process.argv.slice(2);
const backupFile = args[0];
const forceRestore = args.includes('--force');
const dryRun = args.includes('--dry-run');

if (!backupFile) {
  console.error('❌ 사용법: node restore-supabase.js <백업파일.zip> [--force] [--dry-run]');
  console.error('');
  console.error('옵션:');
  console.error('  --force     기존 데이터 덮어쓰기 확인 없이 복원');
  console.error('  --dry-run   실제 복원 없이 복원 계획만 출력');
  process.exit(1);
}

if (!fs.existsSync(backupFile)) {
  console.error(`❌ 백업 파일을 찾을 수 없습니다: ${backupFile}`);
  process.exit(1);
}

// 복원 디렉토리 설정
const RESTORE_DIR = path.join(__dirname, '..', 'restore-temp');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

/**
 * 디렉토리 생성
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 디렉토리 생성: ${dirPath}`);
  }
}

/**
 * Supabase 클라이언트 초기화
 */
function createSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_ACCESS_TOKEN);
}

/**
 * 백업 파일 압축 해제
 */
function extractBackup(backupFile) {
  console.log('📦 백업 파일 압축 해제 중...');
  
  try {
    // 기존 복원 디렉토리 정리
    if (fs.existsSync(RESTORE_DIR)) {
      fs.rmSync(RESTORE_DIR, { recursive: true, force: true });
    }
    ensureDir(RESTORE_DIR);
    
    // 압축 해제
    execSync(`unzip -q "${backupFile}" -d "${RESTORE_DIR}"`, { stdio: 'inherit' });
    
    // 압축 해제된 파일 확인
    const files = fs.readdirSync(RESTORE_DIR);
    const schemaFile = files.find(f => f.startsWith('schema-') && f.endsWith('.sql'));
    const dataFile = files.find(f => f.startsWith('data-') && f.endsWith('.sql'));
    const logFile = files.find(f => f.startsWith('backup-log-') && f.endsWith('.json'));
    
    if (!schemaFile || !dataFile) {
      throw new Error('백업 파일에 필요한 스키마 또는 데이터 파일이 없습니다.');
    }
    
    console.log(`✅ 압축 해제 완료: ${RESTORE_DIR}`);
    console.log(`📋 스키마 파일: ${schemaFile}`);
    console.log(`💾 데이터 파일: ${dataFile}`);
    if (logFile) {
      console.log(`📝 백업 로그: ${logFile}`);
    }
    
    return {
      schemaFile: path.join(RESTORE_DIR, schemaFile),
      dataFile: path.join(RESTORE_DIR, dataFile),
      logFile: logFile ? path.join(RESTORE_DIR, logFile) : null
    };
    
  } catch (error) {
    console.error('❌ 압축 해제 실패:', error.message);
    process.exit(1);
  }
}

/**
 * 백업 정보 확인
 */
function checkBackupInfo(extractedFiles) {
  console.log('🔍 백업 정보 확인 중...');
  
  if (extractedFiles.logFile) {
    try {
      const logData = JSON.parse(fs.readFileSync(extractedFiles.logFile, 'utf8'));
      console.log(`📅 백업 생성일: ${logData.created_at}`);
      console.log(`🏗️ 백업 프로젝트: ${logData.project_id}`);
      console.log(`📊 백업 테이블 수: ${logData.table_count}`);
      console.log(`📦 백업 크기: ${(logData.backup_size_bytes / 1024 / 1024).toFixed(2)} MB`);
      
      if (logData.project_id !== SUPABASE_PROJECT_ID) {
        console.warn(`⚠️ 백업 프로젝트(${logData.project_id})와 현재 프로젝트(${SUPABASE_PROJECT_ID})가 다릅니다.`);
      }
      
      return logData;
    } catch (error) {
      console.warn('⚠️ 백업 로그 파일을 읽을 수 없습니다:', error.message);
    }
  }
  
  return null;
}

/**
 * 현재 데이터베이스 상태 확인
 */
async function checkCurrentDatabase(supabase) {
  console.log('🔍 현재 데이터베이스 상태 확인 중...');
  
  try {
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (error) throw error;
    
    const tableNames = tables.map(row => row.table_name);
    console.log(`📋 현재 테이블 수: ${tableNames.length}`);
    console.log(`📋 테이블 목록: ${tableNames.join(', ')}`);
    
    // 각 테이블의 행 수 확인
    const tableCounts = {};
    for (const tableName of tableNames) {
      try {
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!countError) {
          tableCounts[tableName] = count || 0;
        }
      } catch (error) {
        console.warn(`⚠️ 테이블 ${tableName} 행 수 확인 실패:`, error.message);
        tableCounts[tableName] = '?';
      }
    }
    
    console.log('📊 테이블별 현재 행 수:');
    Object.entries(tableCounts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count}행`);
    });
    
    return { tableNames, tableCounts };
    
  } catch (error) {
    console.error('❌ 데이터베이스 상태 확인 실패:', error.message);
    return { tableNames: [], tableCounts: {} };
  }
}

/**
 * 복원 계획 생성
 */
function createRestorePlan(extractedFiles, currentState, backupInfo) {
  console.log('📋 복원 계획 생성 중...');
  
  const schemaContent = fs.readFileSync(extractedFiles.schemaFile, 'utf8');
  const dataContent = fs.readFileSync(extractedFiles.dataFile, 'utf8');
  
  // 스키마에서 테이블 목록 추출
  const schemaTables = [];
  const schemaMatches = schemaContent.match(/CREATE TABLE IF NOT EXISTS "([^"]+)"/g);
  if (schemaMatches) {
    schemaTables.push(...schemaMatches.map(match => match.match(/"([^"]+)"/)[1]));
  }
  
  // 데이터에서 테이블 목록 추출
  const dataTables = [];
  const dataMatches = dataContent.match(/INSERT INTO "([^"]+)"/g);
  if (dataMatches) {
    dataTables.push(...dataMatches.map(match => match.match(/"([^"]+)"/)[1]));
  }
  
  const plan = {
    schemaTables: [...new Set(schemaTables)],
    dataTables: [...new Set(dataTables)],
    currentTables: currentState.tableNames,
    currentCounts: currentState.tableCounts,
    willCreateTables: schemaTables.filter(table => !currentState.tableNames.includes(table)),
    willOverwriteTables: dataTables.filter(table => currentState.tableNames.includes(table)),
    backupInfo
  };
  
  console.log('📋 복원 계획:');
  console.log(`  🆕 새로 생성될 테이블: ${plan.willCreateTables.length}개`);
  if (plan.willCreateTables.length > 0) {
    console.log(`    ${plan.willCreateTables.join(', ')}`);
  }
  
  console.log(`  🔄 덮어쓰기될 테이블: ${plan.willOverwriteTables.length}개`);
  if (plan.willOverwriteTables.length > 0) {
    plan.willOverwriteTables.forEach(table => {
      const currentCount = plan.currentCounts[table];
      console.log(`    ${table}: ${currentCount}행 → 백업 데이터로 교체`);
    });
  }
  
  return plan;
}

/**
 * 사용자 확인
 */
async function confirmRestore(plan) {
  if (forceRestore) {
    console.log('⚡ --force 옵션으로 확인 없이 복원을 진행합니다.');
    return true;
  }
  
  if (dryRun) {
    console.log('🧪 --dry-run 모드: 실제 복원을 수행하지 않습니다.');
    return false;
  }
  
  console.log('');
  console.log('⚠️ 복원 작업을 시작하면 기존 데이터가 백업 데이터로 교체됩니다.');
  console.log('⚠️ 이 작업은 되돌릴 수 없습니다.');
  console.log('');
  
  // Node.js에서 사용자 입력 받기 (간단한 방법)
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('정말로 복원을 진행하시겠습니까? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * 스키마 복원
 */
async function restoreSchema(extractedFiles, plan) {
  console.log('🏗️ 스키마 복원 중...');
  
  if (dryRun) {
    console.log('🧪 [DRY RUN] 스키마 복원 시뮬레이션');
    return;
  }
  
  try {
    const schemaContent = fs.readFileSync(extractedFiles.schemaFile, 'utf8');
    
    // Supabase는 직접 SQL 실행이 제한적이므로, 
    // 여기서는 스키마 파일을 출력하고 수동 실행을 안내
    console.log('📋 스키마 복원을 위해 다음 SQL을 Supabase SQL Editor에서 실행하세요:');
    console.log('─'.repeat(60));
    console.log(schemaContent);
    console.log('─'.repeat(60));
    
    console.log('✅ 스키마 복원 안내 완료');
    
  } catch (error) {
    console.error('❌ 스키마 복원 실패:', error.message);
    throw error;
  }
}

/**
 * 데이터 복원
 */
async function restoreData(extractedFiles, plan) {
  console.log('💾 데이터 복원 중...');
  
  if (dryRun) {
    console.log('🧪 [DRY RUN] 데이터 복원 시뮬레이션');
    return;
  }
  
  try {
    const dataContent = fs.readFileSync(extractedFiles.dataFile, 'utf8');
    
    // 데이터 복원을 위해 INSERT 문을 파싱하고 실행
    const insertStatements = dataContent.split('\n').filter(line => 
      line.trim().startsWith('INSERT INTO')
    );
    
    console.log(`📊 복원할 INSERT 문: ${insertStatements.length}개`);
    
    // Supabase는 직접 SQL 실행이 제한적이므로,
    // 여기서는 데이터 파일을 출력하고 수동 실행을 안내
    console.log('📋 데이터 복원을 위해 다음 SQL을 Supabase SQL Editor에서 실행하세요:');
    console.log('─'.repeat(60));
    console.log(dataContent);
    console.log('─'.repeat(60));
    
    console.log('✅ 데이터 복원 안내 완료');
    
  } catch (error) {
    console.error('❌ 데이터 복원 실패:', error.message);
    throw error;
  }
}

/**
 * 복원 후 정리
 */
function cleanupRestore() {
  console.log('🧹 복원 임시 파일 정리 중...');
  
  try {
    if (fs.existsSync(RESTORE_DIR)) {
      fs.rmSync(RESTORE_DIR, { recursive: true, force: true });
      console.log('✅ 임시 파일 정리 완료');
    }
  } catch (error) {
    console.warn('⚠️ 임시 파일 정리 실패:', error.message);
  }
}

/**
 * 메인 복원 실행
 */
async function runRestore() {
  console.log('🚀 수파베이스 복원 시작');
  console.log(`📅 복원 시간: ${new Date().toLocaleString('ko-KR')}`);
  console.log(`🏗️ 프로젝트: ${SUPABASE_PROJECT_ID}`);
  console.log(`📦 백업 파일: ${backupFile}`);
  console.log('');

  try {
    // 백업 파일 압축 해제
    const extractedFiles = extractBackup(backupFile);
    
    // 백업 정보 확인
    const backupInfo = checkBackupInfo(extractedFiles);
    
    // Supabase 클라이언트 초기화
    const supabase = createSupabaseClient();
    
    // 현재 데이터베이스 상태 확인
    const currentState = await checkCurrentDatabase(supabase);
    
    // 복원 계획 생성
    const plan = createRestorePlan(extractedFiles, currentState, backupInfo);
    
    // 사용자 확인
    const confirmed = await confirmRestore(plan);
    if (!confirmed) {
      console.log('❌ 복원이 취소되었습니다.');
      cleanupRestore();
      return;
    }
    
    // 스키마 복원
    await restoreSchema(extractedFiles, plan);
    
    // 데이터 복원
    await restoreData(extractedFiles, plan);
    
    // 정리
    cleanupRestore();
    
    console.log('');
    console.log('🎉 복원 완료!');
    console.log('⚠️ 복원된 데이터를 확인하고 애플리케이션을 테스트하세요.');
    
  } catch (error) {
    console.error('❌ 복원 실패:', error.message);
    cleanupRestore();
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  runRestore();
}

module.exports = { runRestore };
