const path = require('path');
const puppeteer = require('puppeteer');
const express = require('express');
const fs = require('fs');

const app = express();
const publicDirectoryPath = path.join(__dirname, '../public');
app.use(express.static(publicDirectoryPath));

app.get('/results', (req, res) => {
  const file = './questions.json';
  var obj = JSON.parse(fs.readFileSync(file))
  res.send(obj);
});

app.get('/qanda', (req, res) => {
  if (!req.query.asin) {
    return res.send({
      error: 'You must provide a product ASIN!',
    });
  }

  if (!req.query.pages) {
    return res.send({
      error: 'You must provide a number of pages to scrape!',
    });
  }

  let scrapeQuestionsUrls = async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const productQandaUrl = 'https://www.amazon.com/ask/questions/asin/' + req.query.asin;
    await page.goto(productQandaUrl);

    var lastPageNumber = Number(req.query.pages);
    let results = [];
    for (let index = 0; index < lastPageNumber; index++) {
      await page.waitForSelector('#askPaginationBar > ul > li.a-last > a');
      results = results.concat(await extractedEvaluateCall(page));
      if (index != lastPageNumber - 1) {
        try {
          await page.click('#askPaginationBar > ul > li.a-last > a');
        } catch {
          await page.click('#askPaginationBar > ul > li.a-last > a');
        }
      }
    }

    browser.close();
    return results;
  };

  async function extractedEvaluateCall(page) {
    await page.waitForSelector('#askPaginationBar > ul > li.a-last > a');
    return page.evaluate(() => {
      let questionsLinksSelectors = document.body.querySelectorAll(
        'div[id*=question-][class="a-fixed-left-grid a-spacing-small"] a'
      );
      let questionsUrls = [];
      questionsLinksSelectors.forEach((selector) => {
        questionsUrls.push(selector.getAttribute('href'));
      });
      return questionsUrls;
    });
  }

  scrapeQuestionsUrls().then(async (urls) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    results = [];
    let questionsData = [];
    for (let url of urls) {
      await page.goto('https://www.amazon.com' + url);
      await page.waitForSelector(
        '#a-page > div.a-container > div.a-row.a-spacing-top-large > div.a-column.a-span10.a-span-last > p.a-size-large.askAnswersAndComments.askWrapText > span'
      );

      const questionText = await page.evaluate(() => {
        return document.body.querySelector(
          '#a-page > div.a-container > div.a-row.a-spacing-top-large > div.a-column.a-span10.a-span-last > p.a-size-large.askAnswersAndComments.askWrapText > span'
        ).innerText;
      });

      const date = await page.evaluate(() => {
        return document.body.querySelector(
          '#a-page > div.a-container > div.a-row.a-spacing-top-large > div.a-column.a-span10.a-span-last > p.a-spacing-top-mini.a-size-small.a-color-secondary.aok-inline-block'
        ).innerText;
      });

      const answers = await page.evaluate(() => {
        const answersSelectors = document.body.querySelectorAll('div[id*=answer-]');
        const answersData = [];
        answersSelectors.forEach((selector) => {
          answersData.push({
            answer: selector.querySelector('span').innerText,
            date: selector.querySelector('span[class="a-color-tertiary aok-align-center"]').innerText,
            answerer: selector.querySelector('span[class="a-profile-name"]').innerText,
          });
        });

        return answersData;
      });

      questionsData.push({
        question: questionText,
        date: date,
        answers: answers,
      });
    }

    const file = './questions.json';
    // const file = path.join(__dirname, '../public/questions.json')
    fs.writeFileSync(file, JSON.stringify(questionsData), function (err) {
      if (err) console.error(err);
    });

    res.send(JSON.stringify(questionsData));
  });
});

app.listen(3000, () => {
  console.log('Server is up on port 3000.');
});
