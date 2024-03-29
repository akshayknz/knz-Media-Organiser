import React, {useState, useEffect} from 'react';
import type { NextPage } from 'next'
import Head from 'next/head'
import Main from '../components/Main'
import { KmoContext } from '../components/context';
import Typography from '@mui/material/Typography';
import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';  
import { CircularProgress, Container, FormControlLabel, FormGroup, LinearProgress, Switch, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import Box from '@mui/system/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { SiServerless } from "react-icons/si";
const lightTheme = responsiveFontSizes(createTheme({
  palette: {
    mode: 'light',
  },
  typography: {
    fontFamily: "'Source Sans Pro', sans-serif",
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
}));
const darkTheme = responsiveFontSizes(createTheme({
  palette: {
    mode: 'dark'
  },
  typography: {
    fontFamily: "'Source Sans Pro', sans-serif",
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
}));
const Home: NextPage = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const changeTheme = () => setIsDarkTheme(!isDarkTheme);
  const [folder, setFolder] = useState({} as FileSystemDirectoryHandle);
  const [dbHandle, setDbHandle] = useState({} as FileSystemFileHandle);
  const [cacheHandle, setCacheHandle] = useState({} as FileSystemFileHandle);
  const [db, setDb] = useState({} as Record<string, any>);
  const [filesFound, setFilesFound] = useState(0 as number);
  const [viewer, setViewer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(0);
  const [cache, setCache] = useState(["unset"] as any);
  const [selectedItems, setSelectedItems] = useState([] as any[]);
  const [selectItems, setSelectItems] = useState(false);
  const getFileRecursively: any = async (path: string[], folderToLookIn: FileSystemDirectoryHandle, index: number, full: boolean = false) => {
    // let dir:string = path.shift() || "";
    const newDirectoryHandle = await folderToLookIn.getDirectoryHandle('.kmocache', {create: true});
    const writeFile = async (name : string, content : File) => {
      const newFileHandle = await newDirectoryHandle.getFileHandle(name? name:"name.jpeg", { create: true });
      const writable = await newFileHandle.createWritable();
      await writable.write(content ? content: "content");
      await writable.close();
    }
    
    let pathForNow = path[0];
    if(cache[index] && false){
      if(cache[index][0]==null && full===true){
        //console.log("inside full=true and cache index 0 miss", cache[index]);
        cache[index][0] = await getBlobRecursively(path,folderToLookIn,index)
        //console.log("inside full=true and cache index 0 miss", cache[index][0]);
        await setCache(cache)
        return cache[index]
      }else //console.log("cache hit");
      return cache[index]
    }else{
      let fullImage = await getBlobRecursively(path,folderToLookIn,index)
      let data = await getDataThumb(fullImage);
      cache[index] = [fullImage,data]
      setCache(cache)
      let fileContnets = await dataUrlToFile(data, 'name')
      await writeFile(pathForNow,fileContnets)
      return cache[index]
    }
    
  }
  async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
    const res: Response = await fetch(dataUrl);
    const blob: Blob = await res.blob();
    return new File([blob], fileName, { type: 'image/jpeg' });
  }
  const getBlobRecursively: any = async (path: string[], folderToLookIn: FileSystemDirectoryHandle, index: number, full: boolean = false) => {
    //console.log("cache miss",index, cache[index]);
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
    let thumbSize = 83
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
    return oc.toDataURL('image/jpeg');
  }
  useEffect(() => {
    const savingTimer = setInterval(async ()=>{
      syncWithFileSystem()
    }, 150000);

    return () => clearInterval(savingTimer);
  }, [dbHandle.name, cacheHandle.name])

  const syncWithFileSystem = () => {
    if(dbHandle.name && cacheHandle.name){
        setSaving(true)
        console.log("syncing to filesystem");
        window.webkitStorageInfo.requestQuota(window.PERSISTENT, 10240*10240, async function(grantedBytes:any) {
          setTimeout(() => setSaving(false), 1000);
          const writable: FileSystemWritableFileStream = await dbHandle.createWritable({ keepExistingData: false });
          await writable.write(JSON.stringify(db));
          await writable.close();
          const writable2: FileSystemWritableFileStream = await cacheHandle.createWritable({ keepExistingData: false });
          await writable2.write({ type: "truncate", size: 2 })
          await writable2.write(JSON.stringify(cache));
          await writable2.close();
        console.log("sync complete");
        }, ()=>{});
      return;
    }
  }

  const getUniqueId = () => {
    return 'id' + Math.random().toString(36).substring(5)
  }

  return (
    <ThemeProvider theme={isDarkTheme ? darkTheme : lightTheme}>
      <CssBaseline />
      <Head>
        <title>KMO</title>
        <meta name="description" content="KMO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* <LinearProgress style={{position:"fixed", width: "100vw", zIndex:4}}/> */}
      <Container>
      <Typography variant="h1" pt={9} >K Media Organiser</Typography>
      <Typography>
        A configuration file will be created in the selected folder. Please do not 
        remove the&nbsp;
        <Tooltip title="You can find this file in the root folder thats given access to KMO" arrow placement="top">
           <code>db.json</code> 
        </Tooltip> file. No data is sent to the server from your computer, that is,
        your images, files, directory structure, configuration files, file metadata, etc are 
        all maintained locally, securely. Keep in mind that actions like renaming, deletion, etc.
        will affect your real files and can be irriversible.
      </Typography>
      <FormGroup>
        <FormControlLabel control={<Switch checked={isDarkTheme} onChange={changeTheme} />} label="Dark Mode"/>
      </FormGroup>
      </Container>
      <KmoContext.Provider value={{ 
        folder, setFolder, 
        dbHandle, setDbHandle, 
        db, setDb, 
        filesFound, setFilesFound,
        viewer, setViewer,
        file, setFile,
        getFileRecursively, syncWithFileSystem,
        cache, setCache,
        saving, setSaving,
        cacheHandle, setCacheHandle,
        selectItems, setSelectItems,
        selectedItems, setSelectedItems,
        getUniqueId
        }}>
        <Main/>
      </KmoContext.Provider>
      <SaveBox  className={"savingStyle "+(saving?"savingStyle-active":null)}>
          <CircularProgress  size={22}/> <Typography>Syncing with filesystem</Typography>
        </SaveBox>
    </ThemeProvider>
  )
}

export default Home

const SaveBox = styled(Box)(({ theme }) => (`
  position: fixed;
  z-index: 10;
  bottom: 3vh;
  left: 2vw;
  background: ${theme.palette.background.paper};
  padding: 10px 0px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  align-content: center;
  justify-content: space-around;
  flex-direction: row;
  width: 190px;
  border: 2px solid ${theme.palette.background.paper};
  transition: all .4s;
  transform: translateY(200px);
  opacity:0;
  &.savingStyle-active{
    transform: translateY(0);
    opacity:1;
  }
  .MuiTypography-root{
    font-size:15px;
  }
`))
