var Promise = require('bluebird');
var csv = require('csvtojson');
var config = require('config');
var fs = require('fs');
var util = require('util');
var windows1251 = require('windows-1251');
var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var path = require('chromedriver').path;
var By = webdriver.By;
var service = new chrome.ServiceBuilder(path).build();
chrome.setDefaultService(service);


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


var delay = config.get('delay');
var startWith = config.get('startWith');

driver
    .get('https://phone.1k.by/mobile/')
    .then(function () {
        return Promise
            .promisify(fs.readFile)('./price.csv', 'binary');
    })
    .then(windows1251.decode)
    .then(function (data) {
        console.log('Фаил с ценами открыт!!!');
        return new Promise(function (resolve, reject) {
            var tmp = data.split('\n');
            tmp.shift();
            tmp.pop();
            var price = tmp.reduce(function (price, item) {
                item = item.split(';');
                price.push({
                    name: item[2] && item[2].replace(/"/g, ''),
                    myCost: item[4] && parseInt(item[4].replace(/\D+/g, "")) / 100
                });
                return price;
            }, []);

            return resolve(price)
        });

    })
    .then(function (price) {
        var fileName = ('./price/d' + new Date().toLocaleDateString() + 't' + new Date().toLocaleTimeString().replace(new RegExp(':', 'g'), '-') + '.txt');
        fs.writeFileSync(fileName, 'start', {encoding: 'utf-8', flag: 'w'});
        console.log('Фаил для отчета открыт!!!');
        return Promise
            .resolve(price)
            .map(function (item, i) {
                if (startWith <= i) {
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
                            return Promise.delay(delay);
                        })
                        .then(function () {
                            return driver.findElement(By.name('submitbutton')).click();
                        })
                        .then(function () {
                            if (i === 0) {
                                return driver.selectOption(By.name('order'), 'priceasc');
                            }
                            return true;
                        })
                        .then(function () {
                            return Promise.resolve(driver
                                .findElements(By.className('product_block')))
                                .map(function (good) {
                                    return Promise.props({
                                        cost: good.findElement(By.className('pr-price_mark')).getText(),
                                        name: good.findElement(By.className('pr-line_name')).getText()
                                    })
                                })
                                .then(function (goods) {
                                    return goods
                                        .filter(function (good) {
                                            return good.name === goodName;
                                        })[0].cost
                                })
                                .then(function (costString) {
                                    item.competitorCost = parseInt(costString.replace(/\D+/g, "")) / 100;
                                    item.dumping = item.myCost - item.competitorCost;
                                    item.time = new Date();
                                    if (item.dumping !== 0) {
                                        fs.appendFileSync(fileName, "\n" + util.inspect(item));
                                    }
                                    console.log(item);
                                    return item;
                                });

                        })
                        .catch(console.log)
                }
            })
    })
    .then(function () {
        console.log('Скрипт закончил свое выполнение')
    })
    .catch(console.log);
