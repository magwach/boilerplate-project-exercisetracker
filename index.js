const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const validator = require('validator');
const bodyParser = require('body-parser');
require('dotenv').config();
let count_number = 1;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(__dirname + '/public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Start of challenge

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB!'))
.catch(err => console.error('Connection error:', err));

let user_schema = new mongoose.Schema({
  username: String,
})

let log_schema = new mongoose.Schema({
  description:{
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
    validator: (value) => Number.isInteger(value),
    message: (props) => res.status(400).json({ error: `${props.value} is not an integer`})
  },
  date: {
    type: Date,
    validator: (value) => {
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
    message: (props) => res.status(400).json({ error: `${props.value} is not a valid date`})
  },
});

let userLog_schema = new mongoose.Schema({
  username: String,
  count: String,
  id: String,
  log: [log_schema],
});

const User = mongoose.model('User', user_schema);
const Log = mongoose.model('Log', userLog_schema);

app.post('/api/users', (req, res) => {
  const userName = req.body.username;
  User.findOne({ username: userName })
  .then((foundUser) => {
    if(foundUser)
    {
      res.json({ username:foundUser.username, _id:foundUser._id });
    }
    else
    {
      const newUser = new User({ username:userName });
      newUser.save()
        .then((data) => {
          res.json({ username:newUser.username, _id:newUser._id });
        })
        .catch((err) => res.status(500).send('An error occurred: ' + err));
    }
  })
  .catch((err) => res.status(500).send('An error occurred: ' + err));
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const id = req.params._id;
  const description = req.body.description;
  const input_date = req.body.date;
  const duration = req.body.duration;

  const date = !(input_date)? new Date() : input_date;
  User.findOne({ _id: id })
  .then((foundUser) => {
      let new_excersise = new Log({
        username: foundUser.username,
        count: count_number++,
        id: foundUser._id,
        log: [{
          description: description,
          duration: duration,
          date: date,
        }],
      });
      new_excersise.save().then((data) => {
        res.json({ _id:data.id, username:data.username, date:data.log[0].date.toString(), duration:data.log[0].duration, description:data.log[0].description});
      })
      .catch((err) => res.status(500).send('An error occurred: ' + err));
  })
  .catch((err) => res.status(400).json({ error: 'Invalid user ID' }));
});

app.get('/api/users', (req, res) => {
  User.find({})
  .then((data) => {
   const result = data.map(user => ({
    _id: user._id,
    username: user.username,
  }));
  res.json(result);
  })
  .catch((err) => res.status(500).send('An error occurred: ' + err));
});

app.get('/api/users/:_id/logs', (req, res) => {
  let userId = req.params._id;
  Log.find({ id: userId })
  .then(data => {
    let results = data.map(element => ({
      id: element._id,
      username: element.username,
      count: element.count,
      log:{
        description: element.log[0].description,
        duration:element.log[0].duration,
        date:element.log[0].date.toString(),
      }
    }));
    res.json(results);
  })
  .catch(err => res.status(500).send('An error occurred: ' + err));
});

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  const limitValue = limit ? parseInt(limit, 10) : null;

  if ((fromDate && isNaN(fromDate.getTime())) || (toDate && isNaN(toDate.getTime()))) {
    return res.status(400).json({ error: 'Invalid date format. Use yyyy-mm-dd.' });
  }

  const query = { id: userId };
  if (fromDate || toDate) {
    query["log.date"] = {};
    if (fromDate) query["log.date"].$gte = fromDate;
    if (toDate) query["log.date"].$lte = toDate;
  }

  Log.find(query)
    .limit(limitValue)
    .then(data => {
      const results = data.map(element => ({
        id: element._id,
        username: element.username,
        count: element.count,
        logs: element.log.map(logItem => ({
          description: logItem.description,
          duration: logItem.duration,
          date: logItem.date.toISOString().split('T')[0],
        }))
      }));

      res.json(results);
    })
    .catch(err => res.status(500).json({ error: 'Error retrieving logs', details: err }));
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


// Array Implementation
/*
const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

let count_number = 1;

let users = [];
let logs = [];

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', (req, res) => {
  const username = req.body.username;

  const existingUser = users.find(user => user.username === username);
  if (existingUser) {
    return res.json({ username: existingUser.username, _id: existingUser._id });
  }

  const newUser = { _id: String(users.length + 1), username };
  users.push(newUser);
  res.json(newUser);
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  const user = users.find(user => user._id === userId);
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  const exerciseDate = date ? new Date(date) : new Date();
  if (isNaN(exerciseDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  const newLog = {
    description,
    duration: parseInt(duration, 10),
    date: exerciseDate.toDateString() 
  };

  const logEntry = logs.find(log => log.id === userId);
  if (logEntry) {
    logEntry.log.push(newLog);
    logEntry.count++;
  } else {
    logs.push({
      id: userId,
      username: user.username,
      count: 1,
      log: [newLog]
    });
  }

  res.json({
    username: user.username,
    _id: userId,
    description: newLog.description,
    duration: newLog.duration,
    date: newLog.date
  });
});

app.get('/api/users', (req, res) => {
  res.json(users.map(user => ({ _id: user._id, username: user.username })));
});

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  const user = users.find(user => user._id === userId);
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  let userLogs = logs.find(log => log.id === userId)?.log || [];

  if (from) {
    const fromDate = new Date(from);
    if (isNaN(fromDate.getTime())) {
      return res.status(400).json({ error: 'Invalid from date format' });
    }
    userLogs = userLogs.filter(log => new Date(log.date) >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    if (isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid to date format' });
    }
    userLogs = userLogs.filter(log => new Date(log.date) <= toDate);
  }

  if (limit) {
    const limitValue = parseInt(limit, 10);
    if (isNaN(limitValue)) {
      return res.status(400).json({ error: 'Invalid limit value' });
    }
    userLogs = userLogs.slice(0, limitValue);
  }

  userLogs = userLogs.map(log => ({
    description: log.description,
    duration: log.duration,
    date: new Date(log.date).toDateString()
  }));

  res.json({
    _id: userId,
    username: user.username,
    count: userLogs.length,
    log: userLogs
  });
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

*/