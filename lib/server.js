// External dependencies
const fs = require("fs")
const path = require("path")
const express = require("express")
const { createWebhooksApi } = require("@octokit/webhooks") // To recieve webhook events
const { createAppAuth } = require("@octokit/auth-app") 
const { Octokit } = require("@octokit/rest")

// Local dependencies
const smeeClient = require(path.join(__dirname, "smee.js"))

// Setup
const port = 64897
const app = express()
const config = JSON.parse(fs.readFileSync("config.json", "utf8"))
const privateKey = fs.readFileSync("gh-app.pem", "utf8")    // Read the downloaded privateKey

const smee = smeeClient(config.webproxy_url, port)
smee.start()

// App
const webhooks = new createWebhooksApi({secret: "SAG", path: "/webhooks"})
app.use(webhooks.middleware)

webhooks.on("issues.opened", async(event) => {
  const { payload } = event

  const authRest = await createAuthRest(payload) // Create a authenticated rest client.

  // console.log(payload)
  
  const [owner, repo, issue_number] = [payload.repository.owner.login, payload.repository.name, payload.issue.number]
  authRest.request(`POST /repos/${owner}/${repo}/issues/${issue_number}/comments`,{
    body: "This is a automated comment"
  })
})

webhooks.onError((error) => {
  console.log(`Error occured in handler: ${error.stack}`)
})

const listener = app.listen(port, () => {
  console.log("Your app is listening on port " + listener.address().port)
})

async function createAuthRest(p) {
  const auth = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: config.github_app_id,
      privateKey: privateKey,
      installationId: p.installation.id
    }
  })
  return auth
}