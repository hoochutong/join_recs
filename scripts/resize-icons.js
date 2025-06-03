// scripts/resize-icons.js
// 아이콘의 내부 요소 스케일을 조정하는 스크립트입니다.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 패딩 비율 설정 (0.1 = 10% 패딩, 0.2 = 20% 패딩)
// 패딩이 작을수록 내부 요소가 커집니다
const PADDING_RATIO = 0.1; // 10% 패딩 (내부 요소가 90% 크기)

// 처리할 아이콘 파일들과 크기 정보
const iconFiles = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 }
];

async function resizeIcon(filename, targetSize) {
  const inputPath = path.join('public', filename);
  const backupPath = path.join('public', `backup-${filename}`);
  
  try {
    // 원본 파일 백업 (이미 있으면 건너뛰기)
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(inputPath, backupPath);
      console.log(`✅ 백업 생성: ${backupPath}`);
    }
    
    // 원본 이미지 정보 가져오기
    const metadata = await sharp(backupPath).metadata();
    console.log(`📏 ${filename}: ${metadata.width}x${metadata.height}`);
    
    // 패딩 계산 (전체 크기에서 패딩 비율만큼 제외)
    const totalPadding = Math.floor(targetSize * PADDING_RATIO);
    const contentSize = targetSize - totalPadding;
    const offset = Math.floor(totalPadding / 2);
    
    console.log(`🔧 캔버스: ${targetSize}x${targetSize}, 내부 콘텐츠: ${contentSize}x${contentSize}, 오프셋: ${offset}px`);
    
    // Step 1: 투명한 배경 캔버스 생성
    const canvas = sharp({
      create: {
        width: targetSize,
        height: targetSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });
    
    // Step 2: 원본 이미지를 내부 콘텐츠 크기로 리사이즈
    const resizedContent = await sharp(backupPath)
      .resize(contentSize, contentSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    // Step 3: 리사이즈된 콘텐츠를 캔버스에 배치
    await canvas
      .composite([{
        input: resizedContent,
        top: offset,
        left: offset
      }])
      .png()
      .toFile(inputPath);
    
    const scalePercent = Math.round(((targetSize - totalPadding) / targetSize) * 100);
    console.log(`🎯 ${filename}: 내부 콘텐츠를 전체 크기의 ${scalePercent}%로 확대 완료\n`);
    
  } catch (error) {
    console.error(`❌ ${filename} 처리 중 오류:`, error.message);
  }
}

async function processAllIcons() {
  const scalePercent = Math.round(((1 - PADDING_RATIO) * 100));
  console.log(`🚀 아이콘 내부 요소 스케일링 시작`);
  console.log(`📐 패딩 비율: ${Math.round(PADDING_RATIO * 100)}% → 내부 콘텐츠: ${scalePercent}% 크기\n`);
  
  for (const { name, size } of iconFiles) {
    await resizeIcon(name, size);
  }
  
  console.log('✨ 모든 아이콘 처리 완료!');
  console.log('💡 결과가 마음에 들지 않으면: npm run restore-icons');
  console.log('🔄 다른 스케일로 재시도: scripts/resize-icons.js에서 PADDING_RATIO 수정 (0.05 = 더 크게, 0.2 = 더 작게)');
}

// 스크립트 실행
processAllIcons().catch(console.error); 