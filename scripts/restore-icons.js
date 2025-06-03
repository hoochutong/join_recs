// scripts/restore-icons.js
// 백업된 원본 아이콘 파일들을 복원하는 스크립트입니다.
const fs = require('fs');
const path = require('path');

// 복원할 아이콘 파일들
const iconFiles = [
  'favicon-16x16.png',
  'favicon-32x32.png', 
  'favicon-48x48.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png'
];

function restoreIcon(filename) {
  const backupPath = path.join('public', `backup-${filename}`);
  const targetPath = path.join('public', filename);
  
  try {
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, targetPath);
      console.log(`✅ 복원 완료: ${filename}`);
      return true;
    } else {
      console.log(`⚠️ 백업 파일 없음: backup-${filename}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${filename} 복원 중 오류:`, error.message);
    return false;
  }
}

function restoreAllIcons() {
  console.log('🔄 원본 아이콘 복원 시작\n');
  
  let restored = 0;
  for (const filename of iconFiles) {
    if (restoreIcon(filename)) {
      restored++;
    }
  }
  
  console.log(`\n✨ 복원 완료! (${restored}/${iconFiles.length}개 파일)`);
  
  if (restored > 0) {
    console.log('💡 변경사항을 확인하려면 브라우저를 새로고침하세요.');
  }
}

// 스크립트 실행
restoreAllIcons(); 