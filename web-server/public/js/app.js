console.log('javascript client side');

const form = document.querySelector('form');
const asinInputSelector = document.querySelector('#asin');
const pagesAmuontInputSelector = document.querySelector('#pages');
const errorMessage = document.querySelector('#inputerror')
const scrapingLabelSelector = document.querySelector('#scraping')
// const scrapingLabelSelector = document.querySelector('#scraping')
const resultsLinkSelector = document.querySelector('#jsonlink')

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const asin = asinInputSelector.value;
  const pagesAmount = pagesAmuontInputSelector.value;

  console.log('Started scraping');
  scrapingLabelSelector.textContent = 'Scraping... please wait...'

  fetch('http://localhost:3000/qanda?asin=' + asin + '&pages=' + pagesAmount).then((response) => {
    response.json().then((data) => {
      if (data.error) {
        console.log(data.error);
      } else {
        resultsLinkSelector.removeAttribute("disabled");

        console.log(data);
      }
    });
  });
});
