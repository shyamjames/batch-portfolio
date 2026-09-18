import { PDFParse } from 'pdf-parse';

async function test() {
  try {
    const res = await fetch('https://mehmet-kozan.github.io/pdf-parse/pdf/simple-table.pdf');
    const buffer = Buffer.from(await res.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    console.log("Success:", result.text.substring(0, 50));
    await parser.destroy();
  } catch (err) {
    console.error(err);
  }
}
test();
