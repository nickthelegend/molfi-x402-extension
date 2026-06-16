import * as path from 'path';
import * as fs from 'fs';
import Mocha from 'mocha';

function getTestFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getTestFiles(filePath));
    } else if (file.endsWith('.test.js')) {
      results.push(filePath);
    }
  });
  return results;
}

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
  });

  const testsRoot = path.resolve(__dirname, '../../');

  return new Promise((c, e) => {
    try {
      const files = getTestFiles(testsRoot);

      // Add files to the test suite
      files.forEach((f) => mocha.addFile(f));

      // Run the mocha test
      mocha.run((failures: number) => {
        if (failures > 0) {
          e(new Error(`${failures} tests failed.`));
        } else {
          c();
        }
      });
    } catch (err) {
      console.error(err);
      e(err);
    }
  });
}
