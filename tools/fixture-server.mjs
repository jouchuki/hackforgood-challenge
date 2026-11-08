import express from 'express';
const app=express();app.use(express.static('dist'));
app.get('*',(_req,res)=>res.sendFile(new URL('../dist/demo/index.html',import.meta.url).pathname));
app.listen(3004,'127.0.0.1',()=>console.log('Second-origin fixture: http://localhost:3004/demo/forum (Before endpoint http://localhost:3000)'));
