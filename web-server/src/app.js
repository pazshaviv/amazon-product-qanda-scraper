const puppeteer = require('puppeteer');
const express = require('express');
const fs = require('fs');
const app = express();

app.get('/qanda', (req, res) => {
  if (!req.query.asin) {
    return res.send({
      error: 'You must provide a product ASIN!',
    });
  }

  let scrapeQuestionsUrls = async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const productQandaUrl = 'https://www.amazon.com/ask/questions/asin/' + 'B07P6Y7954';
    await page.goto(productQandaUrl);

    var lastPageNumber = 1;
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

  let scrape = async (url) => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const productQandaUrl = 'https://www.amazon.com/ask/questions/asin/' + 'B07P6Y7954';
    await page.goto(productQandaUrl);

    const productTitle = await page.evaluate(() => {
      return document.body.querySelector('a[class="a-size-large a-link-normal"]').innerText;
    });

    var lastPageNumber = 4;
    let results = [productTitle];
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

    // browser.close();
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
      // var productQandAScrapedData = {
      //   questions: questionsUrls,
      // };

      // let questionsSelectors = document.body.querySelectorAll('div > div.a-fixed-left-grid-col.a-col-right > a > span');
      // let votesAmountsSelectors = document.body.querySelectorAll(
      //   'div > div.a-fixed-left-grid-col.a-col-left > ul > li.label > span.count'
      // );
      // let questionSectionSelectors = document.body.querySelectorAll('div[class="a-section askTeaserQuestions"] > div');
      // let questionsArray = [];
      // for (var i = 0; i < questionSectionSelectors.length; i++) {
      //   answerSelector = questionSectionSelectors[i].querySelector('div[id*=askSeeAllAnswersLink]');
      //   let allAnswersLink = '';
      //   if (answerSelector !== null) {
      //     allAnswersLink = answerSelector.querySelector('a').getAttribute('href');
      //   }
      //   const question = {
      //     question: questionsSelectors[i].innerText,
      //     answer: allAnswersLink,
      //     votes: votesAmountsSelectors[i].innerText,
      //   };
      //   questionsArray.push(question);
      // }
      // var productQandAScrapedData = {
      //   questions: questionsArray,
      // };
      return questionsUrls;
    });
  }

  scrapeQuestionsUrls().then(async (urls) => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    results = [];
    let questionText = '';
    let questionSelector = null;
    let questionsTitles = [];
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
            answerer: selector.querySelector('span[class="a-profile-name"]').innerText
          });
        });

        return answersData;
      });

      questionsTitles.push({
        question: questionText,
        date: date,
        answers: answers,
      });

      //   questionSelector = document.body.querySelectorAll(
      //     'div[id="a-page"]'
      //     // '#a-page > div.a-container > div.a-row.a-spacing-top-large > div.a-column.a-span10.a-span-last > p.a-size-large.askAnswersAndComments.askWrapText > span'

      // if (questionSelector !== null){
      //   questionText = 'not null'
      // }
      // });

      // questionText = questionSelector.innerText;
      // results.push([
      //   {
      //     question: questionText,
      //   },
      // ]);
    }

    const file = './questions.json';
    fs.writeFile(file, JSON.stringify(questionsTitles), function (err) {
      if (err) console.error(err);
    });

    const urlsFile = './urls.json';
    fs.writeFile(urlsFile, JSON.stringify(urls), function (err) {
      if (err) console.error(err);
    });

    res.send(JSON.stringify(urls));
  });

  //   scrape().then((value) => {
  //     productTitle = value[0];
  //     questions = [];
  //     for (var i = 1; i < value.length; i++) {
  //       questions = questions.concat(value[i].questions);
  //     }
  //     const file = './qanda.json';
  //     fs.writeFile(file, JSON.stringify(questions), function (err) {
  //       if (err) console.error(err);
  //     });
  //     res.send(
  //       'Showing Questions and Answers for: <h1>' +
  //         JSON.stringify(productTitle) +
  //         '</h1>\n' +
  //         'response: \n' +
  //         JSON.stringify(questions)
  //     );
  //   });
});

app.listen(3000, () => {
  console.log('Server is up on port 3000.');
});
