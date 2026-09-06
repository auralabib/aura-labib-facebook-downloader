const express=require("express");
const path=require("path");
const app=express();
const PORT=process.env.PORT||3000;
const RAPIDAPI_KEY=process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST="facebook-reel-and-video-downloader.p.rapidapi.com";
app.use(express.json({limit:"20kb"}));
app.use(express.static("public"));

function collectUrls(value,pathParts=[],out=[]){
 if(value&&typeof value==="object") for(const [k,v] of Object.entries(value)){
  const p=[...pathParts,k];
  if(typeof v==="string"&&/^https?:\/\//i.test(v)) out.push({key:k,path:p.join("."),url:v});
  else if(v&&typeof v==="object") collectUrls(v,p,out);
 } return out;
}
function makeFormats(data){
 const all=collectUrls(data), preferred=all.filter(x=>/download|video|hd|high|sd|low|source|url/i.test(x.path+" "+x.key));
 const unique=[]; for(const x of [...preferred,...all]) if(!unique.some(y=>y.url===x.url)) unique.push(x);
 return unique.slice(0,6).map((x,i)=>({label:/high|hd/i.test(x.path+" "+x.key)?"High Quality":/sd|low/i.test(x.path+" "+x.key)?"Standard Quality":`Download ${i+1}`,url:x.url}));
}
app.post("/api/download",async(req,res)=>{
 try{
  if(!RAPIDAPI_KEY)return res.status(500).json({error:"RAPIDAPI_KEY is not configured on the server."});
  const videoUrl=String(req.body?.url||"").trim(); if(!videoUrl)return res.status(400).json({error:"Facebook URL is required."});
  let host; try{host=new URL(videoUrl).hostname.toLowerCase()}catch{return res.status(400).json({error:"Invalid URL."})}
  if(!(host==="facebook.com"||host.endsWith(".facebook.com")||host==="fb.watch"))return res.status(400).json({error:"Only Facebook URLs are supported."});
  const apiUrl="https://"+RAPIDAPI_HOST+"/app/main.php?url="+encodeURIComponent(videoUrl);
  const response=await fetch(apiUrl,{method:"GET",headers:{"x-rapidapi-key":RAPIDAPI_KEY,"x-rapidapi-host":RAPIDAPI_HOST,"Content-Type":"application/json"}});
  const text=await response.text(); let data; try{data=JSON.parse(text)}catch{data={raw:text}};
  if(!response.ok)return res.status(response.status).json({error:"RapidAPI request failed.",details:data});
  const formats=makeFormats(data); if(data?.success===false||!formats.length)return res.status(422).json({error:"The API did not return a downloadable video URL.",details:data});
  res.json({title:data.title||"Facebook Video",thumbnail:data.thumbnail||"",formats});
 }catch(e){console.error(e);res.status(500).json({error:"Server error while processing the video."})}
});
app.get("/{*splat}",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`AURA LABIB running on port ${PORT}`));
