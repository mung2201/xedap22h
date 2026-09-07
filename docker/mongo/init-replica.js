const configuration = {
  _id: 'rs0',
  members: [{ _id: 0, host: 'localhost:27017' }],
};

try {
  rs.initiate(configuration);
  print('Replica set rs0 initialized.');
} catch (error) {
  print(`Replica set initialization skipped: ${error}`);
}
