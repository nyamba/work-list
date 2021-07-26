'use strict';

const Parser = require('rss-parser')
const Converter = require('html-entities')
const Moment = require('moment')
const parser = new Parser()
const AWS = require('aws-sdk')

const URL = process.env.FETCH_URL
const dynamodb = new AWS.DynamoDB.DocumentClient()

const getCountry = (content) => {
  const lines = content.split('\n');
  const country_line = lines.filter( line => line.indexOf('<b>Country</b>:') >= 0)
  const country = country_line[0].split(':')[1]

  return country.trim()
}

const putItem = (work) => {

}


const fetch_works = async (event, context) => {

  let feed = await parser.parseURL(URL);

  feed.items.forEach(async (item, index) => {
    let work = {}
  	work['title'] = Converter.decode(item.title.split('-')[0])
  	work['country'] = getCountry(item.content)
  	work['pubDate'] = item.pubDate
    work['content'] = item.content

    const param = {
      TableName: process.env.WORK_LIST_TN,
      Item: work
    }
    await dynamodb.put(param).promise()
  });

  return {
    statusCode: 200,
    body: JSON.stringify("Fetched data! " + feed.items.length)
  }
};

fetch_works();

module.exports.fetch_works = fetch_works