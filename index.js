'use strict';

const Parser = require('rss-parser')
const Converter = require('html-entities')
const crypto = require('crypto')
const parser = new Parser()
const AWS = require('aws-sdk')
const util = require('util')

AWS.config.update({region: process.env.AWS_REGION})

const URL = process.env.FETCH_URL
const STAGE = process.env.STAGE

const localDB = {
    region: 'localhost',
    endpoint: 'http://localhost:8000'
}
const dbconfig = STAGE == 'dev'? localDB : {apiVersion: '2012-08-10'}

const dynamodb = new AWS.DynamoDB(dbconfig)

const getCountry = (content) => {
  const lines = content.split('\n');
  const country_line = lines.filter( line => line.indexOf('<b>Country</b>:') >= 0)
  const country = country_line[0].split(':')[1]

  return country.trim()
}

function hashCode(str){
  const md5 = crypto.createHash('md5')
  return md5.update(str, 'utf8').digest('hex')
}

const fetch_works = async (event, context) => {

  let feed = await parser.parseURL(URL);
  console.log(feed.title)

  

  feed.items.forEach(async (item, index) => {
    let work = {}
  	work['title'] = {'S': item.title}
  	work['country'] = {'S': getCountry(item.content)}
  	work['pubDate'] = {'S': item.pubDate}
    work['content'] = {'S': item['content']}
    work['id'] = {'S': 'v' + index}
    work['guid'] = {'S': item.guid}

    const param = {
      TableName: process.env.WORK_LIST_TN,
      Item: work,
      ReturnValues: 'ALL_NEW'
    }

    if(index == 1){
      console.log('putting', index)
      try{
        await dynamodb.putItem(param).promise()
        console.log('success')
      }catch(err){
        console.log('Error', err)
      }
    }

  });

  const body = {
    message: "Fetched data! " + feed.items.length,
    version: '1.0.1'
  }

  return {
    statusCode: 200,
    body: JSON.stringify(body)
  }
};

const insert = async (event, context) => {
  const params = event.queryStringParameters

  const dyParam = {
    TableName: process.env.WORK_LIST_TN,
    Item: {
      id: {'S': params.id},
      content: {'S': params.content}
    },
    ReturnValues: 'ALL_OLD'
  }
  let error = null
  let data = null

  try{
    data = await dynamodb.putItem(dyParam).promise()
  } catch(err) {
      error = err
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      id: params.id,
      content: params.content,
      data: data,
      error: error
    })
  }
}

module.exports.insert = insert
module.exports.fetch_works = fetch_works