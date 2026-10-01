export type MidiOutputInfo = { id: string; name: string; manufacturer?: string };

export class WebMidiController {
  private access: MIDIAccess | null = null;
  private output: MIDIOutput | null = null;
  private channel = 0;
  private octave = 4;
  private ccValues = new Map<number, number>();

  async connect(): Promise<MidiOutputInfo[]> {
    if (!("requestMIDIAccess" in navigator)) return [];
    this.access = await navigator.requestMIDIAccess();
    const outputs = [...this.access.outputs.values()];
    if (!this.output && outputs[0]) this.output = outputs[0];
    return outputs.map(output => ({
      id: output.id,
      name: output.name || "MIDI Output",
      manufacturer: output.manufacturer || undefined
    }));
  }

  setOutput(id: string): void {
    const output = this.access?.outputs.get(id);
    if (!output) throw new Error("MIDI output not found.");
    this.output = output;
  }

  getOutput(): MidiOutputInfo | null {
    return this.output ? {
      id: this.output.id,
      name: this.output.name || "MIDI Output",
      manufacturer: this.output.manufacturer || undefined
    } : null;
  }

  noteOn(note:number, velocity=100):void{this.send([0x90|this.channel,note&0x7f,velocity&0x7f]);}
  noteOff(note:number, velocity=0):void{this.send([0x80|this.channel,note&0x7f,velocity&0x7f]);}
  controlChange(controller:number,value:number):void{
    const normalized=Math.max(0,Math.min(127,Math.round(value)));
    this.ccValues.set(controller,normalized);
    this.send([0xb0|this.channel,controller&0x7f,normalized]);
  }
  setOctave(octave:number):void{this.octave=Math.max(1,Math.min(7,octave));}
  getCC(controller:number):number{return this.ccValues.get(controller)??64;}
  private send(message:number[]):void{this.output?.send(message);}
}

export const MIDI_NOTE_NAMES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
export function midiNoteName(note:number):string{
  return `${MIDI_NOTE_NAMES[note%12]}${Math.floor(note/12)-1}`;
}
