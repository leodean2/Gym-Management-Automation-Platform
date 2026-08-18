const app = require('./app');
const { port, nodeEnv } = require('./config/env');

app.listen(port, () => {
  console.log(`[server] Gym Rocks Fitness API listening on port ${port} (${nodeEnv})`);
});
