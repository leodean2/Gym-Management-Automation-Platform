// tests/helpers/auth.js
//
// Thin wrapper around the login endpoint so test files don't repeat
// request.post('/api/v1/auth/login')... boilerplate for every actor.

const request = require('supertest');

async function loginAs(app, email, password) {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });

  if (response.status !== 200) {
    throw new Error(
      `loginAs(${email}) failed with status ${response.status}: ${JSON.stringify(response.body)}`
    );
  }

  return response.body.data.access_token;
}

module.exports = { loginAs };
