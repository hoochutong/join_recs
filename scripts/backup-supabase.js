#!/usr/bin/env node

/**
 * 수파베이스 데이터베이스 백업 스크립트
 * - 스키마 덤프 (DDL)
 * - 데이터 백업 (INSERT 문)
 * - 압축 및 타임스탬프 추가
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

// 백업 디렉토리 설정
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
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
 * 테이블 목록 조회
 */
async function getTables(supabase) {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (error) throw error;
    
    return data.map(row => row.table_name);
  } catch (error) {
    console.error('❌ 테이블 목록 조회 실패:', error.message);
    return [];
  }
}

/**
 * 스키마 덤프 생성
 */
async function dumpSchema(supabase, tables) {
  console.log('📋 스키마 덤프 생성 중...');
  
  const schemaFile = path.join(BACKUP_DIR, `schema-${TIMESTAMP}.sql`);
  let schemaContent = `-- 수파베이스 스키마 백업
-- 생성일시: ${new Date().toLocaleString('ko-KR')}
-- 프로젝트: ${SUPABASE_PROJECT_ID}

`;

  // 각 테이블의 스키마 정보 수집
  for (const tableName of tables) {
    try {
      // 테이블 구조 정보 조회
      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');

      if (colError) {
        console.warn(`⚠️ 테이블 ${tableName} 컬럼 정보 조회 실패:`, colError.message);
        continue;
      }

      // CREATE TABLE 문 생성
      schemaContent += `-- 테이블: ${tableName}\n`;
      schemaContent += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;
      
      const columnDefs = columns.map(col => {
        let def = `  "${col.column_name}" ${col.data_type}`;
        if (col.is_nullable === 'NO') def += ' NOT NULL';
        if (col.column_default) def += ` DEFAULT ${col.column_default}`;
        return def;
      });
      
      schemaContent += columnDefs.join(',\n') + '\n';
      schemaContent += `);\n\n`;
      
    } catch (error) {
      console.warn(`⚠️ 테이블 ${tableName} 스키마 처리 실패:`, error.message);
    }
  }

  fs.writeFileSync(schemaFile, schemaContent);
  console.log(`✅ 스키마 덤프 완료: ${schemaFile}`);
  return schemaFile;
}

/**
 * 데이터 백업 생성
 */
async function dumpData(supabase, tables) {
  console.log('💾 데이터 백업 생성 중...');
  
  const dataFile = path.join(BACKUP_DIR, `data-${TIMESTAMP}.sql`);
  let dataContent = `-- 수파베이스 데이터 백업
-- 생성일시: ${new Date().toLocaleString('ko-KR')}
-- 프로젝트: ${SUPABASE_PROJECT_ID}

`;

  for (const tableName of tables) {
    try {
      console.log(`  📊 테이블 ${tableName} 데이터 백업 중...`);
      
      // 테이블 데이터 조회
      const { data: rows, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) {
        console.warn(`⚠️ 테이블 ${tableName} 데이터 조회 실패:`, error.message);
        continue;
      }

      if (!rows || rows.length === 0) {
        console.log(`  ℹ️ 테이블 ${tableName}은 비어있습니다.`);
        continue;
      }

      // 컬럼명 추출
      const columns = Object.keys(rows[0]);
      
      // INSERT 문 생성
      dataContent += `-- 테이블 ${tableName} 데이터 (${rows.length}개 행)\n`;
      
      for (const row of rows) {
        const values = columns.map(col => {
          const value = row[col];
          if (value === null) return 'NULL';
          if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
          if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
          if (value instanceof Date) return `'${value.toISOString()}'`;
          return `'${String(value)}'`;
        });
        
        dataContent += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      
      dataContent += '\n';
      console.log(`  ✅ 테이블 ${tableName}: ${rows.length}개 행 백업 완료`);
      
    } catch (error) {
      console.warn(`⚠️ 테이블 ${tableName} 데이터 백업 실패:`, error.message);
    }
  }

  fs.writeFileSync(dataFile, dataContent);
  console.log(`✅ 데이터 백업 완료: ${dataFile}`);
  return dataFile;
}

/**
 * 백업 파일 압축
 */
function compressBackup(schemaFile, dataFile) {
  console.log('🗜️ 백업 파일 압축 중...');
  
  const zipFile = path.join(BACKUP_DIR, `supabase-backup-${TIMESTAMP}.zip`);
  
  try {
    execSync(`zip -j "${zipFile}" "${schemaFile}" "${dataFile}"`, { stdio: 'inherit' });
    console.log(`✅ 압축 완료: ${zipFile}`);
    
    // 개별 파일 삭제
    fs.unlinkSync(schemaFile);
    fs.unlinkSync(dataFile);
    console.log('🗑️ 개별 파일 정리 완료');
    
    return zipFile;
  } catch (error) {
    console.error('❌ 압축 실패:', error.message);
    return null;
  }
}

/**
 * 백업 정보 로그 생성
 */
function createBackupLog(backupFile, tables) {
  const logFile = path.join(BACKUP_DIR, `backup-log-${TIMESTAMP}.json`);
  
  const logData = {
    timestamp: TIMESTAMP,
    created_at: new Date().toISOString(),
    project_id: SUPABASE_PROJECT_ID,
    backup_file: path.basename(backupFile),
    tables_backed_up: tables,
    table_count: tables.length,
    backup_size_bytes: fs.statSync(backupFile).size
  };
  
  fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
  console.log(`📝 백업 로그 생성: ${logFile}`);
  return logFile;
}

/**
 * 오래된 백업 파일 정리 (최근 6개월만 유지)
 */
function cleanupOldBackups() {
  console.log('🧹 오래된 백업 파일 정리 중...');
  
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('supabase-backup-') && file.endsWith('.zip'))
    .map(file => ({
      name: file,
      path: path.join(BACKUP_DIR, file),
      mtime: fs.statSync(path.join(BACKUP_DIR, file)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  // 최근 2개월(60일) 이전 파일 삭제
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 60);
  
  let deletedCount = 0;
  for (const file of files) {
    if (file.mtime < cutoffDate) {
      fs.unlinkSync(file.path);
      console.log(`🗑️ 오래된 백업 삭제: ${file.name}`);
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    console.log(`✅ ${deletedCount}개 오래된 백업 파일 정리 완료`);
  } else {
    console.log('ℹ️ 정리할 오래된 백업 파일이 없습니다.');
  }
}

/**
 * 메인 백업 실행
 */
async function runBackup() {
  console.log('🚀 수파베이스 백업 시작');
  console.log(`📅 백업 시간: ${new Date().toLocaleString('ko-KR')}`);
  console.log(`🏗️ 프로젝트: ${SUPABASE_PROJECT_ID}`);
  console.log('');

  try {
    // 백업 디렉토리 생성
    ensureDir(BACKUP_DIR);
    
    // Supabase 클라이언트 초기화
    const supabase = createSupabaseClient();
    
    // 테이블 목록 조회
    const tables = await getTables(supabase);
    if (tables.length === 0) {
      console.log('⚠️ 백업할 테이블이 없습니다.');
      return;
    }
    
    console.log(`📋 백업 대상 테이블 (${tables.length}개): ${tables.join(', ')}`);
    console.log('');
    
    // 스키마 백업
    const schemaFile = await dumpSchema(supabase, tables);
    
    // 데이터 백업
    const dataFile = await dumpData(supabase, tables);
    
    // 압축
    const backupFile = compressBackup(schemaFile, dataFile);
    if (!backupFile) {
      throw new Error('백업 파일 압축 실패');
    }
    
    // 백업 로그 생성
    createBackupLog(backupFile, tables);
    
    // 오래된 백업 정리
    cleanupOldBackups();
    
    console.log('');
    console.log('🎉 백업 완료!');
    console.log(`📦 백업 파일: ${backupFile}`);
    console.log(`📊 백업 크기: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('❌ 백업 실패:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  runBackup();
}

module.exports = { runBackup };
