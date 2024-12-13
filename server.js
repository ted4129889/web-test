const express = require('express');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;
const GRPC_HOST = 'localhost:8081';
// const GRPC_HOST = '10.1.9.16:50001'; // fac
// const GRPC_HOST = '10.1.9.167:50001'; // NCL
// const GRPC_HOST = '10.1.9.211:50001'; // NCL-BATCH

app.use(express.json());
app.use(cors());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const PROTO_PATH = path.join(__dirname, 'service.proto');
const REQUEST_DIR = path.join(__dirname, 'request');
const TITA_DIR = path.join(__dirname, 'tita');
const LABEL_DIR = path.join(TITA_DIR, 'label');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// 封装 gRPC 客户端连接管理的类
class GrpcClientManager {
  constructor(host) {
    this.host = host;
    this.client = this.createClient();
  }

  createClient() {
    return new protoDescriptor.com.bot.fsap.model.grpc.common.Service(this.host, grpc.credentials.createInsecure());
  }

  closeClient() {
    if (this.client) {
      this.client.close();
      console.log('gRPC client closed');
    }
  }

  callRpcPeriphery(request, callback) {
    console.log('Sending gRPC request:', JSON.stringify(request, null, 2));
    this.client.rpcPeriphery(request, (error, response) => {
      if (error) {
        console.error('gRPC error:', error);
        this.closeClient(); // 關閉舊的 gRPC客戶端
        this.client = this.createClient(); // 重新初始化 gRPC 客户端
        console.log('gRPC client re-initialized');
        return callback(error, null);
      } else {
        return callback(null, response);
      }
    });
  }
}

const grpcClientManager = new GrpcClientManager(GRPC_HOST);

app.get('/api/tita', (req, res) => {
  fs.readdir(TITA_DIR, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).json({ error: err.message });
    }
    const jsonFiles = files.filter(file => file.toLowerCase().endsWith('.json'));
    console.info('tita:', jsonFiles);
    res.json(jsonFiles);
  });
});

app.get('/api/tita/:titaLayoutName', (req, res) => {
  const filePath = path.join(TITA_DIR, req.params.titaLayoutName);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).json({ error: err.message });
    }
    const jsonObj = JSON.parse(data);
    if (jsonObj.LABEL.LABEL_TYPE === 'FAS_TITA_LABEL') {
      const labelFilePath = path.join(LABEL_DIR, 'FAS_TITA_LABEL.json');
      fs.readFile(labelFilePath, 'utf8', (err, labelData) => {
        if (err) {
          console.error('Error reading file:', err);
          return res.status(500).json({ error: err.message });
        }
        const labelJsonObj = JSON.parse(labelData);
        jsonObj.LABEL = { ...jsonObj.LABEL, ...labelJsonObj.LABEL };
        res.json(jsonObj);
      });
    } else if (jsonObj.LABEL.LABEL_TYPE === 'FSAP_TITA_LABEL') {
      const labelFilePath = path.join(LABEL_DIR, 'FSAP_TITA_LABEL.json');
      fs.readFile(labelFilePath, 'utf8', (err, labelData) => {
        if (err) {
          console.error('Error reading file:', err);
          return res.status(500).json({ error: err.message });
        }
        const labelJsonObj = JSON.parse(labelData);
        jsonObj.LABEL = { ...jsonObj.LABEL, ...labelJsonObj.LABEL };
        res.json(jsonObj);
      });
    } else {
      res.json(jsonObj);
    }
  });
});

app.get('/api/dirs', (req, res) => {
  fs.readdir(REQUEST_DIR, { withFileTypes: true }, (err, items) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).json({ error: err.message });
    }
    const dirs = items
      .filter(item => item.isDirectory())
      .map(item => item.name);
    res.json(dirs);
  });
});

app.get('/api/dirs/:dirname', (req, res) => {
  const dir = path.join(REQUEST_DIR, req.params.dirname);
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).json({ error: err.message });
    }
    const jsonFiles = files.filter(file => file.toLowerCase().endsWith('.json'));
    res.json(jsonFiles);
  });
});

app.get('/api/files/:dirname/:filename', (req, res) => {
  const filePath = path.join(REQUEST_DIR, req.params.dirname, req.params.filename);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(JSON.parse(data));
  });
});

app.post('/api/files/:dirname/:filename', (req, res) => {
  let dirname = req.params.dirname;
  let filename = req.params.filename;
  if (!filename.toLowerCase().endsWith('.json')) {
    filename += '.json';
  }
  const filePath = path.join(REQUEST_DIR, dirname, filename);
  fs.writeFile(filePath, JSON.stringify(req.body, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).send('File saved successfully');
  });
});

app.post('/api/saveas/:dirname', (req, res) => {
  let dirname = req.params.dirname;
  let { filename, content } = req.body;
  if (!filename.toLowerCase().endsWith('.json')) {
    filename += '.json';
  }
  const filePath = path.join(REQUEST_DIR, dirname, filename);
  fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).send('New file saved successfully');
  });
});

app.post('/api/test', (req, res) => {
  const request = req.body;
  grpcClientManager.callRpcPeriphery(request, (error, response) => {
    if (error) {
      res.status(500).json({ error: error.message });
    } else {
      res.json(response);
    }
  });
});

// 靜態文件中間件
app.use('/static', express.static(path.join(__dirname, 'public')));

// 首頁
app.get('/', (req, res) => {
  const version = Date.now();
  res.render('index', { version });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
