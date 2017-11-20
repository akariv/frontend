const test = require('ava')

var config = require('../config')
var lib = require('../lib/')
var mocks = require('./fixtures')

mocks.initMocks()

const api = new lib.DataHubApi(config)
test('Gets datapackage.json (as extended)', async t => {
  let res = await api.getPackageFile('admin', 'demo-package')
  let dpjson = await res.json()
  t.is(dpjson.name, 'demo-package')
  t.is(dpjson.datahub.findability, 'published')
  t.is(dpjson.resources.length, 4)
})

test('Gets datapackage.json signedUrl', async t => {
  let res = await api.getPackageFile(
      'admin', 'private-package', 'datapackage.json', 'token')
  let dpjson = await res.json()
  t.is(dpjson.name, 'demo-package')
  t.is(dpjson.datahub.findability, 'published')
  t.is(dpjson.resources.length, 4)
})

test("Generates logical dp from extended dp", async t => {
	const extended = require('./fixtures/extended-dp/datapackage.json')
	const logical = lib.DataHubApi.extendedToLogical(extended)
	// The main one has name of Original
	t.is(logical.resources[0].name, 'co2-mm-mlo')
  t.is(logical.resources[0].datahub.derivedFrom[0], 'co2-mm-mlo')
	// Original is in alternates
	t.is(extended.resources[17], logical.resources[5].alternates[0])
	// Json version is in alternates
	t.is(extended.resources[1], logical.resources[0].alternates[1])

  const extendedNonTabular = require('./fixtures/extended-dp-non-tabular/datapackage.json')
  const logicalNonTabular = lib.DataHubApi.extendedToLogical(extendedNonTabular)
  // It doesn't change anything
  t.deepEqual(extendedNonTabular, logicalNonTabular)
})

test("Generates good dp from prepareForFrontend dp", async t => {
  const dp = {resources:
    [
      {
        name: 'test',
        alternates: [
          {
            name: 'alt',
            datahub: {type: 'derived/json'}
          }
        ]
      }
    ]
  }
  const goodDp = lib.DataHubApi.makeGoodDp(dp)
  t.is(goodDp.downloads[0].name, 'test')
  t.is(goodDp.downloads[0].otherFormats[0].name, 'alt')
})

test('Gets README', async t => {
  const res = await api.getPackageFile('admin', 'demo-package', 'README.md')
  const readme = await res.text()
  t.is(readme.slice(0,27), 'This README and datapackage')
})

test('Gets whole package', async t => {
  const dp = await api.getPackage('admin', 'demo-package')
  t.is(dp.title, 'DEMO - CBOE Volatility Index')
  t.is(dp.datahub.owner, 'admin')
  t.is(dp.path, `${api.bitstoreUrl}${dp.datahub.ownerid}/${dp.name}/latest`)
  t.is(dp.readme.slice(0,27), 'This README and datapackage')
  t.is(dp.readmeSnippet.length, 294)
  t.true(dp.readmeHtml.includes('<p>This README and datapackage'))
})

test('getPackage has normalized resources', async t => {
  const dp = await api.getPackage('admin', 'demo-package')
  t.is(dp.resources.length, 1)
  t.is(dp.resources[0].name, 'demo-resource')
  t.is(dp.resources[0].datahub.derivedFrom[0], 'demo-resource')
  t.is(dp.resources[0].alternates.length, 2)
  // Test for prepareForFrontend applied
  t.is(dp.datahub.stats.prettyBytes, '86kB')
  t.is(dp.resources[0].prettyBytes, '23kB')
})

test('Gets list of packages', async t => {
  const listOfPkgIds = [
    {ownerid: 'core', name: 'gold-prices'},
    {ownerid: 'core', name: 'house-prices-us'}
  ]
  const listOfDp = await api.getPackages(listOfPkgIds)
  t.is(listOfDp.length, 2)
  t.is(listOfDp[1].title, 'DEMO - CBOE Volatility Index')
  // t.is(listOfDp[1].owner, 'core')
  t.is(listOfDp[1].readme.slice(0,27), 'This README and datapackage')
})

test('Handles errors if file cannot be retrieved', async t => {
  let res = await api.getPackageFile('bad-user', 'bad-package')
  t.is(res.status, 404)
})

test('Handles errors if file cannot be retrieved', async t => {
  const res = await api.authenticate() // Without jwt so we get urls for login
  t.is(res.authenticated, false)
  t.deepEqual(res.providers.github,{ url: 'https://github.com/login/' })
  t.deepEqual(res.providers.google,{ url: 'https://accounts.google.com/o/oauth2/auth' })
})

test('Metastore API wrapper (search) function works', async t => {
  let query = 'q="test"&size=20'
  let res = await api.search(query)
  let logical = require('./fixtures/logical-dp/datapackage.json')
  t.is(res.results[0].resources.length, logical.resources.length)
  t.is(res.summary.total, 1)
  t.is(res.results[0].datahub.owner, 'core')
  t.is(res.results[0].datahub.stats.prettyBytes, '192kB')
  t.is(res.results[0].readmeSnippet.length, 293)
})

test('Metastore API wrapper (events) function works', async t => {
  let query = 'owner="publisher"&size=10'
  let res = await api.getEvents(query)
  t.is(res.results.length, 1)
})

test('Authenticates with GitHub using given jwt and returns user info', async t => {
  const jwt = '1a2b3c'
  const res = await api.authenticate(jwt)
  t.is(res.authenticated, true)
  t.is(res.profile.email, 'test_username_but_not_email')
  t.is(res.profile.name, 'Firstname Secondname')
})

test('Authenticates with GOOGLE using given jwt and returns user info', async t => {
  const jwt = '1a2b3c4d'
  const res = await api.authenticate(jwt)
  t.is(res.authenticated, true)
  t.is(res.profile.email, 'actual_email@gmail.com')
  t.is(res.profile.name, 'Firstname Secondname')
})

test('pipelineStatus hits status API and returns status object', async t => {
  const ownerid = 'admin'
  const name = 'running-package'
  const res = await api.pipelineStatus(ownerid, name, 'status')
  t.is(res.state, 'RUNNING')
})

test('getProfile method works', async t => {
  const owner = 'admin'
  const res = await api.getProfile(owner)
  const exp = {
    found: true,
    profile: {
      id: 'admin',
      join_date: 'Mon, 24 Jul 2017 12:17:50 GMT'
    }
  }
  t.deepEqual(res, exp)

  const notExist = 'notexist'
  const badRes = await api.getProfile(notExist)
  const expBadRes = {
    found: false,
    profile: null
  }
  t.deepEqual(badRes, expBadRes)
})

test('Resolves path', async t => {
  const path_ = 'publisher/package'
  const res = await api.resolve(path_)
  t.is(res.userid, 'publisher')
  t.is(res.packageid, 'package')
})
