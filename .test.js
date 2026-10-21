module.exports.run = async (page, base, shot) => {
  const out = [];
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  await page.waitForFunction(() => document.querySelector('#st-model').textContent.startsWith('ready'), {timeout: 240000});
  out.push(['model loaded: ' + await page.$eval('#st-model', e=>e.textContent), true]);
  const samples = [
    ['sample-cat.jpg', /cat|tabby|tiger|siamese|egyptian/i, 'cat'],
    ['sample-dog.jpg', /labrador|retriever|dog|golden/i, 'dog'],
    ['sample-pizza.jpg', /pizza/i, 'pizza'],
    ['sample-bird.jpg', /macaw|parrot|lorikeet/i, 'bird'],
  ];
  for (const [file, re, label] of samples) {
    await page.click(`[data-s="${file}"]`);
    await page.waitForFunction(() => document.querySelector('#stage').classList.contains('scanning'), {timeout: 30000});
    await page.waitForFunction(() => !document.querySelector('#stage').classList.contains('scanning'), {timeout: 180000});
    await sleep(300);
    const top1 = await page.$eval('#pred .prow.top .lbl', e => e.textContent);
    out.push([label + ' -> top1 "' + top1.trim() + '"', re.test(top1)]);
    const rows = await page.$$eval('#pred .prow', r => r.length);
    out.push([label + ' top-5 rows: ' + rows, rows === 5]);
  }
  const n = await page.$eval('#st-n', e => +e.textContent);
  out.push(['classified count: ' + n, n === 4]);
  const hist = await page.$$eval('#hist .hcell', r => r.length);
  out.push(['history cells: ' + hist, hist === 4]);
  const ms = await page.$eval('#st-ms', e => +e.textContent);
  out.push(['inference ms recorded: ' + ms, ms > 0]);
  if (shot) await page.screenshot({path: shot});
  return out;
};
