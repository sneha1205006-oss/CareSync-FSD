const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.join(__dirname, '../../screenshots');
const ARTIFACT_DIR = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\980f75f0-bffc-4e80-98a4-fd3819543bb1\\screenshots';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function saveScreenshot(page, filename) {
  const file1 = path.join(OUTPUT_DIR, filename);
  const file2 = path.join(ARTIFACT_DIR, filename);
  await page.screenshot({ path: file1, fullPage: false });
  fs.copyFileSync(file1, file2);
  console.log(`✓ Saved screenshot: ${filename}`);
}

async function run() {
  console.log('--- Launching Chrome for Automated Screenshots ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Login Page
  console.log('1. Capturing Login Page...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await saveScreenshot(page, '01_login_page.png');

  // 2. Receptionist Dashboard & Token Issue
  console.log('2. Logging in as Receptionist and Issuing Emergency Token...');
  // Click receptionist demo button
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text.includes('Receptionist') && text.includes('Sarah Jenkins')) {
      await btn.click();
      break;
    }
  }
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // Select Emergency Priority
  const priorityBtns = await page.$$('button');
  for (const btn of priorityBtns) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text === 'Emergency') {
      await btn.click();
      break;
    }
  }

  // Fill Patient Name, Age, Phone, Complaint
  await page.type('input[placeholder="e.g. Johnathan Doe"]', 'Marcus Holloway');
  await page.type('input[placeholder="e.g. 42"]', '52');
  await page.type('input[placeholder="+1-555-0100"]', '+1-555-4321');
  await page.type('textarea[placeholder="Brief reason for consultation..."]', 'Severe radiating chest pain - Immediate triage');

  // Click Issue Token
  const submitBtns = await page.$$('button[type="submit"]');
  for (const btn of submitBtns) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text.includes('Issue OPD Token')) {
      await btn.click();
      break;
    }
  }

  // Wait for Token Slip Modal
  await page.waitForSelector('h3', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 1200));
  await saveScreenshot(page, '02_receptionist_token_issued.png');

  // Close modal
  const closeBtns = await page.$$('button');
  for (const btn of closeBtns) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text === 'Close') {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 800));

  // 3. Public Waiting-Hall Display
  console.log('3. Capturing Public Waiting-Hall Screen...');
  await page.goto('http://localhost:5173/display', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await saveScreenshot(page, '03_public_waiting_hall_display.png');

  // 4. Doctor Queue Screen (Call Next)
  console.log('4. Logging in as Doctor and Calling Next Patient...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  const docBtns = await page.$$('button');
  for (const btn of docBtns) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text.includes('Doctor (Cardiology)') && text.includes('Dr. Rajesh Sharma')) {
      await btn.click();
      break;
    }
  }
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // Click "Call Next Patient"
  const callBtns = await page.$$('button');
  for (const btn of callBtns) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text.includes('Call Next Patient')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1500));

  // Add notes
  const noteArea = await page.$('textarea[placeholder="Enter diagnosis, prescription, or follow-up instructions..."]');
  if (noteArea) {
    await noteArea.type('Sublingual nitroglycerin given. ECG shows normal sinus rhythm. Cleared for discharge.');
  }
  await new Promise(r => setTimeout(r, 1000));
  await saveScreenshot(page, '04_doctor_station_called.png');

  // 5. Bed Availability Grid (Admit & Discharge)
  console.log('5. Logging in as Ward Staff and Managing Beds...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  const wardBtns = await page.$$('button');
  for (const btn of wardBtns) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text.includes('Ward Staff') && text.includes('Marcus Vance')) {
      await btn.click();
      break;
    }
  }
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // Click "Admit Patient" on the first available bed
  const admitBtns = await page.$$('button');
  let clickedAdmit = false;
  for (const btn of admitBtns) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text === 'Admit Patient') {
      await btn.click();
      clickedAdmit = true;
      break;
    }
  }

  if (clickedAdmit) {
    await page.waitForSelector('input[placeholder="e.g. Maria Gonzalez"]', { timeout: 5000 });
    await page.type('input[placeholder="e.g. Maria Gonzalez"]', 'Sophia Thorne');
    await page.type('input[placeholder="35"]', '41');
    await page.type('input[placeholder="+1-555-0199"]', '+1-555-7766');
    await page.type('input[placeholder="Dr. Rajesh Sharma"]', 'Dr. Rajesh Sharma');
    await page.type('input[placeholder="e.g. Acute Appendicitis / Post-op observation"]', 'Acute Coronary Syndrome Monitoring');

    // Confirm Admission
    const confBtns = await page.$$('button[type="submit"]');
    for (const btn of confBtns) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.includes('Confirm Admission')) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  await saveScreenshot(page, '05_bed_grid_admitted.png');

  // Handle dialog auto-confirm for discharge
  page.on('dialog', async dialog => {
    await dialog.accept();
  });

  // Discharge patient
  const dischargeBtns = await page.$$('button');
  for (const btn of dischargeBtns) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text.includes('Discharge Patient')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1500));
  await saveScreenshot(page, '06_bed_grid_discharged_cleaning.png');

  // 6. Reports & Analytics Dashboard
  console.log('6. Capturing Reports Dashboard with Charts...');
  await page.goto('http://localhost:5173/analytics', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await saveScreenshot(page, '07_reports_analytics_dashboard.png');

  await browser.close();
  console.log('\n--- All Automated Browser Screenshots Captured Successfully! ---');
}

run().catch(err => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
