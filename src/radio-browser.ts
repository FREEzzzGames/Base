export interface RadioBrowserStation{
  readonly stationuuid:string; readonly name:string; readonly url:string; readonly url_resolved:string;
  readonly homepage:string; readonly favicon:string; readonly tags:string; readonly country:string;
  readonly countrycode:string; readonly language:string; readonly codec:string; readonly bitrate:number;
  readonly votes:number; readonly lastcheckok:number;
}
const SERVERS=["https://de1.api.radio-browser.info","https://nl1.api.radio-browser.info","https://at1.api.radio-browser.info"] as const;
export class RadioBrowserClient{
  private serverIndex=0;
  private async request<T>(path:string):Promise<T>{
    let last:unknown;
    for(let offset=0;offset<SERVERS.length;offset++){
      const index=(this.serverIndex+offset)%SERVERS.length;
      try{
        const response=await fetch(SERVERS[index]+path,{headers:{Accept:"application/json"}});
        if(!response.ok)throw new Error(`Radio Browser HTTP ${response.status}`);
        this.serverIndex=index;
        return await response.json() as T;
      }catch(error){last=error;}
    }
    throw last instanceof Error?last:new Error("Radio Browser is unavailable.");
  }
  async searchStations(genre:string,query:string,limit=30):Promise<readonly RadioBrowserStation[]>{
    const params=new URLSearchParams({hidebroken:"true",is_https:"true",order:"votes",reverse:"true",limit:String(limit)});
    if(genre)params.set("tag",genre);
    if(query.trim())params.set("name",query.trim());
    const stations=await this.request<RadioBrowserStation[]>(`/json/stations/search?${params}`);
    return stations.filter(s=>s.stationuuid&&s.name&&/^https:\/\//i.test(s.url_resolved||s.url)&&s.lastcheckok!==0);
  }
}
