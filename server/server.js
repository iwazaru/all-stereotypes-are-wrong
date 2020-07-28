'use strict';

const express = require('express');

const couples = require('./data/couples');
const checkToken = require('./middlewares/check-token');
const getCombinationId = require('./helpers/get-combination-id');
const getStats = require('./helpers/get-stats');

const { sequelize, Answer, Combination, Token } = require('./models');

sequelize.sync();

const port = process.env.PORT || 5000;
const app = express();
app.use(express.json());
app.use(express.static('../client/build'));

/** CHOOSE API */

app.get('/couples', async function(request, response) {
  const couple1 = couples.getRandom();
  const couple2 = couples.getRandom(couple1);

  const combination = getCombinationId(couple1.id, couple2.id);
  const token = await Token.create({ combination });
  response.json({ couples: [couple1, couple2], token: token.token });
});

app.get('/stats', async function(request, response) {
  const stats = await getStats();
  response.json(stats);
});

app.post('/answer', checkToken, async function(request, response) {
  const association1 = request.body.association1
    .split(',')
    .sort()
    .join(',');
  const association2 = request.body.association2
    .split(',')
    .sort()
    .join(',');
  const answerContent = [association1, association2].sort().join(';');

  try {
    let answer = await Answer.findOne({ where: { answer: answerContent } });
    if (!answer) {
      answer = await Answer.create({
        answer: answerContent,
        combination: request.combination,
      });
    }
    answer.count = answer.count + 1;
    await Answer.update({ count: answer.count }, { where: { id: answer.id } });

    let combination = await Combination.findOne({
      where: {
        combination: request.combination,
      },
    });
    if (!combination) {
      combination = await Combination.create({
        combination: request.combination,
      });
    }
    combination.count = combination.count + 1;
    await Combination.update(
      { count: combination.count },
      { where: { id: combination.id } }
    );

    const stats = await getStats();

    response
      .status(200)
      .json({ count: answer.count, total: combination.count, stats });
  } catch (error) {
    response.status(500).json({ error });
  }
});

/** BROWSE API */

app.get('/browse/couples', async function(request, response) {
  response.json({ couples: couples.getAll() });
});


app.listen(port, function() {
  process.stdout.write(`ASAW server is listening on port ${port}\n`);
});
