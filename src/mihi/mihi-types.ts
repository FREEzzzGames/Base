export type MihiLayer=1|2|3|4|5|6|7|8|9|10;
export type MihiContext="home"|"live"|"chat"|"game"|"radio"|"library"|"profile"|"windows"|"system"|"mystery";
export type MihiInteractionType="speech"|"action";

export interface MihiInteraction{
  id:string;
  semanticId:string;
  type:MihiInteractionType;
  context:MihiContext;
  layer:MihiLayer;
  label:string;
}

export interface MihiReply{
  id:string;
  semanticId:string;
  context:MihiContext;
  layer:MihiLayer;
  text:string;
}

export interface MihiEasterEgg{
  id:string;
  title:string;
  context:MihiContext;
  layer:MihiLayer;
  requiredEvents:string[];
  onceOnly:boolean;
  text:string;
}

export interface MihiState{
  layer:MihiLayer;
  context:MihiContext;
  attention:number;
  visible:boolean;
  recentInteractionIds:string[];
  discoveredEggs:string[];
}