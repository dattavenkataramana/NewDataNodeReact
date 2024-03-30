const express = require('express')

const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const dbPath = path.join(__dirname,"data.db")
const app = express()
app.use(express.json())
app.use(cors())
let db = null 

const InitailizeDbserverAndDatabase = async () =>{
    try{
        db = await open({
            filename:dbPath,
            driver:sqlite3.Database,

        })
        app.listen(3001, ()=>{
            console.log(`server nunning at http://localhost:3001`)
        })
    }catch(err){
       console.log(`DB Error: ${err.message}`)
       process.exit(1)
    }
}

InitailizeDbserverAndDatabase()

 
app.get('/newdata/',async (request,response)=>{
    const getData = `SELECT * FROM user`
    const data = await db.all(getData)
    response.send(data)
  
})

app.post("/api/register", async (request, response) => {
    const {username,mobilenumber,email,password} = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    console.log(dbUser)
    if (dbUser === undefined) {
      const createUserQuery = `
        INSERT INTO 
          user (username,mobilenumber,email,password) 
        VALUES 
          (
            '${username}', 
            '${mobilenumber}',
            '${email}',
            '${hashedPassword}'
          )`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.send(`Created new user with ${newUserId}`);
    } else {
      response.status = 400;
      response.send("User already exists");
    }
  });


app.post("/api/login", async (request, response) => {
    const { email, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE email = '${email}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      response.status(400);
      response.send("Invalid User");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched === true) {
        const payload = {
            email:email,
        }
        const jwtToken = jwt.sign(payload,"MY_Secrect_Token")
        response.send(jwtToken);
      } else {
        response.status(400);
        response.send("Invalid Password");

      }
    }
  });


  /*const authendicationMiddleware = (request,response,next)=>{
  let jwtToken 
    const  authHeader =  request.headers["authorization"];
    if( authHeader !==   undefined){
        jwtToken = authHeader.split(' ')[1]
    }
    if(jwtToken  === undefined){
        response.status = 401
        response.send("Invalid Access Token")
    }else{
        jwt.verify(jwtToken,"MY_Secrect_Token" , async (err,payload)=>{
        if(err){
            response.send("Invalid Access Token")
          }else{
            request.email = payload.email;
            next();
             
          }
        })
    }

  }*/

  const authendicationMiddleware = (request, response, next) => {
    const authHeader = request.headers["authorization"];
    if (!authHeader) {
      response.status(401).send("Missing Access Token");
      return;
    }
  
    const token = authHeader.split(' ')[1];
    if (!token) {
      response.status(401).send("Invalid Access Token");
      return;
    }
  
    jwt.verify(token, "MY_Secrect_Token", (err, decoded) => {
      if (err) {
        response.status(401).send("Invalid Access Token");
        return;
      }
      request.email = decoded.email;
      next();
    });
  }
  
  app.get('/apidata/',authendicationMiddleware,async (request,response)=>{
            const getData = `SELECT * FROM user`
            const data = await db.all(getData)
            response.send(data)
          
})
