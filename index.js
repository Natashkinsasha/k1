var Promise = require('bluebird');
var fileSave = require('file-save');
var fs = require('fs');
var util = require('util');
var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var path = require('chromedriver').path;
var By = webdriver.By;
var DeathByCaptcha = require('deathbycaptcha');

var service = new chrome.ServiceBuilder(path).build();
chrome.setDefaultService(service);

var dbc = new DeathByCaptcha("Natashkinsasha", "Natashkin6426384");

var driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();

function selectOption(selector, item) {
    var selectList, desiredOption;

    selectList = this.findElement(selector);
    selectList.click();

    return selectList.findElements(By.tagName('option'))
        .then(function (options) {
            options.some(function (option) {
                option.getAttribute('value').then(function (text) {
                    if (item === text) {
                        desiredOption = option;
                        return true;
                    }
                });
            });
        })
        .then(function clickOption() {
            if (desiredOption) {
                desiredOption.click();
            }
        });
}

driver.selectOption = selectOption.bind(driver);

function saveScreenshot() {
    return driver.takeScreenshot().then(function (data) {
        fs.writeFileSync('./test.png', data.replace(/^data:image\/png;base64,/, ''), 'base64');
        return data.replace(/^data:image\/png;base64,/, '');
    })
}


driver.saveScreenshot = saveScreenshot.bind(driver);

const price = [{name: 'iPhone 7', myCost: 132000},
    {name: 'iPhone 6', myCost: 85000},
    {name: 'iPhone 5s', myCost: 57000},
    {name: 'iPhone 5', myCost: 47000}]
;

driver
    .get('https://1k.by/users/login')
    .then(function () {
        return driver.takeScreenshot();
    })
    .then(function (screenshot) {
        return driver.saveScreenshot('./captcha.png')
    })
    .then(function (data) {
        console.log(data)
        return new Promise(function (resolve, reject) {
            return dbc.solve(data, function (err, id, solution) {
                if (err) return reject(err);
                return resolve(solution);
            });
        });
    })
    .then(function (solution) {
        console.log(solution);
    })
    .catch(function (err) {
        console.log(err)
    });
/*driver
 .get('https://phone.1k.by/mobile/')
 .then(function () {
 return Promise.resolve(price)
 .map(function (item) {
 var goodName = item.name;
 return driver
 .findElement(By.id('keywords'))
 .then(function (input) {
 return input.clear()
 .then(function () {
 return input.sendKeys(goodName)
 })
 })
 .then(function () {
 return driver.findElement(By.name('submitbutton')).click();
 })
 .then(function () {
 return driver.selectOption(By.name('order'), 'priceasc');
 })
 .then(function () {
 return driver
 .findElement(By.className('pr-price_mark'))
 .then(function (costElement) {
 return costElement.getText()
 })
 .then(function (costString) {
 item.competitorCost = parseInt(costString.replace(/\D+/g, ""));
 return item;
 });
 })
 })
 })
 .then(function (newPrice) {
 var fileName = ('./price/d' + new Date().toLocaleDateString() + 't' + new Date().toLocaleTimeString().replace(new RegExp(':', 'g'), '-') + '.txt');
 return fs.writeFileSync(fileName, util.inspect(newPrice), {encoding: 'utf-8', flag: 'w'});
 })
 .catch(console.log);
 */
//priceasc