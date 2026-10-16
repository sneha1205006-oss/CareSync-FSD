const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.join(__dirname, '../../screenshots');
const ARTIFACT_DIR = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\980f75f0-bffc-4e80-98a4-fd3819543bb1\\screenshots';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Doctor Screen with Active Patient
  console.log('Logging in as Dr. Sharma...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

  // Click Dr. Sharma
  const docButtons = await page.$$('button');
  for (const btn of docButtons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text.includes('Doctor (Cardiology)')) {
      await btn.click();
      break;
    }
  }
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // Find Call Next Patient button by xpath or evaluate click
  console.log('Clicking Call Next Patient...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const callBtn = btns.find(b => b.innerText.includes('Call Next Patient'));
    if (callBtn) callBtn.click();
  });

  // Wait 2 seconds for active consultation card and timer to update
  await new Promise(r => setTimeout(r, 2000));

  // Type clinical notes into the textarea
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    if (ta) {
      ta.value = 'Sublingual nitroglycerin administered. ECG shows normal sinus rhythm. Patient pain score 0/10. Cleared for discharge.';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  const docFile = path.join(OUTPUT_DIR, '04_doctor_station_active_consultation.png');
  const docFileArt = path.join(ARTIFACT_DIR, '04_doctor_station_active_consultation.png');
  await page.screenshot({ path: docFile, fullPage: false });
  fs.copyFileSync(docFile, docFileArt);
  console.log('✓ Saved 04_doctor_station_active_consultation.png');

  // 2. Receptionist Dashboard view showing the full live table
  console.log('Logging in as Receptionist...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  const recButtons = await page.$$('button');
  for (const btn of recButtons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text.includes('Receptionist')) {
      await btn.click();
      break;
    }
  }
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  const recFile = path.join(OUTPUT_DIR, '02b_receptionist_live_table.png');
  const recFileArt = path.join(ARTIFACT_DIR, '02b_receptionist_live_table.png');
  await page.screenshot({ path: recFile, fullPage: false });
  fs.copyFileSync(recFile, recFileArt);
  console.log('✓ Saved 02b_receptionist_live_table.png');

  // 3. Updated Public Display Screen
  console.log('Capturing updated Public Display...');
  await page.goto('http://localhost:5173/display', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  const dispFile = path.join(OUTPUT_DIR, '03_public_waiting_hall_display.png');
  const dispFileArt = path.join(ARTIFACT_DIR, '03_public_waiting_hall_display.png');
  await page.screenshot({ path: dispFile, fullPage: false });
  fs.copyFileSync(dispFile, dispFileArt);
  console.log('✓ Updated 03_public_waiting_hall_display.png');

  await browser.close();
}

run().catch(console.error);
