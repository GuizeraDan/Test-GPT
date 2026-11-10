// Run after tools/build_godot_web.sh. Playwright Core is an optional test tool.
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const {chromium} = await import(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const root = fileURLToPath(new URL('../', import.meta.url));
const port = process.env.GODOT_TEST_PORT || '3022';
const server = spawn(process.execPath, ['server.mjs'], {cwd:root, env:{...process.env, PORT:port}});
let browser;
try {
  await Promise.race([
    once(server.stdout, 'data'),
    once(server, 'exit').then(([code]) => {throw Error(`Server exited: ${code}`);}),
  ]);
  browser = await chromium.launch({
    executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (/SCRIPT ERROR|Parse Error|Invalid call|Invalid access/.test(message.text())) errors.push(message.text());
  });
  await page.goto(`http://127.0.0.1:${port}/godot/?test=1`);
  await page.waitForFunction(() => window.godotState?.engine === 'Godot', {}, {timeout:90000});
  const command = async value => {
    await page.evaluate(v => window.godotCommand = v, value);
    await page.waitForFunction(() => !window.godotCommand);
  };
  const finished = () => page.waitForFunction(() => !godotState.busy && Object.keys(godotState.pending).length === 0, {}, {timeout:20000});

  // Exercise a real native card button, not only the automation bridge.
  await page.mouse.click(125, 805);
  await page.waitForFunction(() => godotState.busy);
  await finished();
  assert.equal(await page.evaluate(() => godotState.state.enemy.hp), 88, 'native card button');
  await command('reset');
  await page.screenshot({path:'/tmp/godot-initial.png'});
  for (const [key,hp,hits] of [
    ['strike',88,1],['blast',80,4],['beam',50,1],['superBeam',20,1],['kienzan',60,1],
    ['charge',100,0],['guard',100,0],['evade',100,0],['transform',100,0],['gogeta',100,0],
  ]) {
    await command('lab:'+key);
    await finished();
    const snapshot = await page.evaluate(() => godotState);
    assert.equal(snapshot.state.enemy.hp,hp,key+' HP');
    assert.equal(snapshot.impacts,hits,key+' impacts');
    assert.equal(snapshot.effects,0,key+' cleanup');
    console.log('OK',key);
  }
  await command('cell:makankosappo');
  await page.waitForFunction(() => godotState.effects > 0);
  await command('pause');
  const time = await page.evaluate(() => godotState.time);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => godotState.time),time,'pause');
  await page.screenshot({path:'/tmp/godot-cell.png'});
  await command('step');
  assert.ok(await page.evaluate(() => godotState.time) > time,'step');
  await command('reset');
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => godotState.effects),0,'reset');
  await command('game');
  await command('end');
  await page.waitForFunction(() => godotState.state.turn === 'player' && !godotState.busy, {}, {timeout:20000});
  assert.equal(await page.evaluate(() => godotState.state.round),2,'CPU turn');
  assert.deepEqual(errors,[]);
  console.log('Godot Web: native card UI, 10 cards, exact damage/hits, Cell effects, pause/step/reset and CPU turn passed');
} finally {
  await browser?.close();
  server.kill();
}
