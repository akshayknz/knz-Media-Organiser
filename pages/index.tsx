import React, {useState, useEffect} from 'react';
import type { NextPage } from 'next'
import Head from 'next/head'
import Main from '../components/Main'
import { KmoContext } from '../components/context';
import Typography from '@mui/material/Typography';
import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';  
import { CircularProgress, Container } from '@mui/material';
import { styled } from '@mui/material/styles';
import Box from '@mui/system/Box';

const themeOptions = {
  typography: {
    fontFamily: "'Source Sans Pro', sans-serif",
    textTransform: "none",
    fontWeight:300,
    h1: {
      fontWeight: 100,
      "@media (max-width: 400px)": { fontSize: "46px" }
    },
    h2: {
      fontWeight: 100,
      "@media (max-width: 400px)": { fontSize: "30px" }
    },
    h3: {
      fontWeight: 100,
    },
    h4: {
      fontWeight: 100
    },
    h5: {
      fontWeight: 100
    },
    h6: {
      fontWeight: 100
    },
    body1: {
      fontWeight: 300,
      fontSize: 18
    },
    body2: {
      fontWeight: 600
    },
    button: {
      fontWeight: 600,
    }
    }
};
let theme = createTheme(themeOptions);
theme = responsiveFontSizes(theme);
const Home: NextPage = () => {
  const [folder, setFolder] = useState({} as FileSystemDirectoryHandle);
  const [dbHandle, setDbHandle] = useState({} as FileSystemFileHandle);
  const [cacheHandle, setCacheHandle] = useState({} as FileSystemFileHandle);
  const [db, setDb] = useState({} as Record<string, any>);
  const [filesFound, setFilesFound] = useState(0 as number);
  const [viewer, setViewer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(0);
  const [cache, setCache] = useState({} as any);
  const getFileRecursively: any = async (path: string[], folderToLookIn: FileSystemDirectoryHandle, index: number, full: boolean = false) => {
    // let dir:string = path.shift() || "";
    if(cache[`index${index}`]){
      if(cache[`index${index}`][0]==null && full===true){
        cache[`index${index}`][0] = await getBlobRecursively(path,folderToLookIn,index)
        setCache(cache)
      }else console.log("cache hit");
      return cache[`index${index}`]
    }else{
      let fullImage = await getBlobRecursively(path,folderToLookIn,index)
      let data = await getDataThumb(fullImage);
      cache[`index${index}`] = [fullImage,data]
      setCache(cache)
      return cache[`index${index}`]
    }
  }
  const getBlobRecursively: any = async (path: string[], folderToLookIn: FileSystemDirectoryHandle, index: number, full: boolean = false) => {
    console.log("cache miss",`index${index}`, cache[`index${index}`]);
    let dir:string = path.shift() || "";
    if(path.length == 0){
      let fileHandle = await folderToLookIn.getFileHandle(dir, {})
      const file = await fileHandle.getFile()
      let fullImage = URL.createObjectURL(file);
      return fullImage
    }else{
      let newFolder = await folderToLookIn.getDirectoryHandle(dir,{create: true})
      return getBlobRecursively(path, newFolder, index)
    }
  }
  const getDataThumb = async (fullImage:any) => {
    let thumbSize = 100
    let img = await new Image()
    img.src = fullImage
    await img.decode();
    let oc = document.createElement('canvas')
    let octx = oc.getContext('2d');
    oc.width = img.width;
    oc.height = img.height;
    // octx?.drawImage(img, 0, 0);
    oc.height = (img.height / img.width) * thumbSize;
    oc.width = thumbSize;
    octx?.drawImage(img, 0, 0, oc.width, oc.height);
    return oc.toDataURL();
  }
  useEffect(() => {
    if(dbHandle.name && cacheHandle.name){
      const savingTimer = setInterval(async ()=>{
        setSaving(true)
        console.log("syncing to filesystem");
        window.webkitStorageInfo.requestQuota(window.PERSISTENT, 10240*10240, async function(grantedBytes:any) {
          console.log(grantedBytes)
          setTimeout(() => setSaving(false), 1000);
          const writable: FileSystemWritableFileStream = await dbHandle.createWritable({ keepExistingData: false });
          await writable.write(JSON.stringify(db));
          await writable.close();
          console.log(grantedBytes)
          const writable2: FileSystemWritableFileStream = await cacheHandle.createWritable({ keepExistingData: false });
          await writable2.write({ type: "truncate", size: 2 })
          await writable2.write(JSON.stringify(cache));
          await writable2.close();
          console.log(grantedBytes)
        }, function() {
        });
        
      }, 15000);
      return () => clearInterval(savingTimer);
    }
    
  }, [dbHandle.name, cacheHandle.name])

  return (
    <ThemeProvider theme={theme}>
      <Head>
        <title>KMO</title>
        <meta name="description" content="KMO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container>
      <Typography variant="h1" pt={11} >K Media Organiser</Typography>
      <Typography>
        A configuration file will be created in the selected folder. Please do not 
        remove the <code>db.json</code> file. No data is sent to the server from your computer, that is,
        your images, files, directory structure, configuration files, file metadata, etc are 
        all maintained locally, securely. Keep in mind that actions like renaming deletion, etc.
        will affect your real files and might be irriversible.
      </Typography>
      <KmoContext.Provider value={{ 
        folder, setFolder, 
        dbHandle, setDbHandle, 
        db, setDb, 
        filesFound, setFilesFound,
        viewer, setViewer,
        file, setFile,
        getFileRecursively,
        cache, setCache,
        saving, setSaving,
        cacheHandle, setCacheHandle
        }}>
        <Main/>
      </KmoContext.Provider>
      <SaveBox  className={"savingStyle "+(saving?"savingStyle-active":null)}>
          <CircularProgress  size={22}/> <Typography>Syncing with filesystem</Typography>
        </SaveBox>
      </Container>
    </ThemeProvider>
  )
}

export default Home

const SaveBox = styled(Box)(`
  position: fixed;
  z-index: 10;
  bottom: 3vh;
  left: 2vw;
  background: #efefef;
  padding: 7px 0px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  align-content: center;
  justify-content: space-around;
  flex-direction: row;
  width: 180px;
  border: 2px solid #dbdada;
  transition: all .4s;
  transform: translateY(200px);
  opacity:0;
  &.savingStyle-active{
    transform: translateY(0);
    opacity:1;
  }
  .MuiTypography-root{
    font-size:13px;
  }
`)
