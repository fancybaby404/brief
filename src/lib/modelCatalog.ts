export type CatalogAsset={
 fileName:string;
 url:string;
 /** Exact size at the pinned revision; a download of any other size is rejected. */
 bytes:number;
};

export type CatalogModel={
 id:string;
 name:string;
 description:string;
 /** Short tag shown next to the name (e.g. 'Recommended', 'Fastest'). */
 badge?:string;
 fileName:string;
 repo:string;
 revision:string;
 sizeLabel:string;
 bytes:number;
 license:string;
 url:string;
 /** Present only on vision models: the matching mmproj encoder, downloaded as one bundle. */
 projector?:CatalogAsset;
};

/** Curated, immutable Hugging Face revisions. Vision models and their projector come from one repository. */
const file=(repo:string,revision:string,name:string)=>`https://huggingface.co/${repo}/resolve/${revision}/${name}`;

export const MODEL_CATALOG:CatalogModel[]=[
 {
  id:'qwen3-vl-2b-q4km',name:'Qwen3‑VL · 2B',badge:'Recommended',description:'Understands text and images. The matching vision encoder is included in the download.',
  fileName:'Qwen3VL-2B-Instruct-Q4_K_M.gguf',repo:'Qwen/Qwen3-VL-2B-Instruct-GGUF',revision:'704a1fab82bbe5dcafa49bcac91a9f4831375886',
  sizeLabel:'about 1.6 GB total',bytes:1_107_409_952,
  license:'Apache 2.0',url:file('Qwen/Qwen3-VL-2B-Instruct-GGUF','704a1fab82bbe5dcafa49bcac91a9f4831375886','Qwen3VL-2B-Instruct-Q4_K_M.gguf'),
  projector:{fileName:'mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf',url:file('Qwen/Qwen3-VL-2B-Instruct-GGUF','704a1fab82bbe5dcafa49bcac91a9f4831375886','mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf'),bytes:445_053_216},
 },
 {
  id:'lfm2-1.2b-q4km',name:'LFM2 · 1.2B',badge:'Fastest',description:'Made for quick on-device replies — the snappiest option for chat and mock interviews. Text only: attaching images stays off.',
  fileName:'LFM2-1.2B-Q4_K_M.gguf',repo:'LiquidAI/LFM2-1.2B-GGUF',revision:'5399e76c648f4eb8c053feb1ab747277dea5bf8b',
  sizeLabel:'about 730 MB',bytes:730_893_248,
  license:'LFM Open License 1.0',url:file('LiquidAI/LFM2-1.2B-GGUF','5399e76c648f4eb8c053feb1ab747277dea5bf8b','LFM2-1.2B-Q4_K_M.gguf'),
 },
 {
  id:'qwen2.5-1.5b-q4km',name:'Qwen2.5 · 1.5B',badge:'Fast',description:'A light, dependable all-rounder for chat and job tracking. Text only: attaching images stays off.',
  fileName:'qwen2.5-1.5b-instruct-q4_k_m.gguf',repo:'Qwen/Qwen2.5-1.5B-Instruct-GGUF',revision:'91cad51170dc346986eccefdc2dd33a9da36ead9',
  sizeLabel:'about 1.1 GB',bytes:1_117_320_736,
  license:'Apache 2.0',url:file('Qwen/Qwen2.5-1.5B-Instruct-GGUF','91cad51170dc346986eccefdc2dd33a9da36ead9','qwen2.5-1.5b-instruct-q4_k_m.gguf'),
 },
 {
  id:'smollm3-3b-q4km',name:'SmolLM3 · 3B',badge:'Sharper',description:'Stronger advice and interview feedback without image reading. Slower and heavier than the small models.',
  fileName:'SmolLM3-Q4_K_M.gguf',repo:'ggml-org/SmolLM3-3B-GGUF',revision:'4965cb60b150737b68a0408c36aeefb65078f894',
  sizeLabel:'about 1.9 GB',bytes:1_915_305_312,
  license:'Apache 2.0',url:file('ggml-org/SmolLM3-3B-GGUF','4965cb60b150737b68a0408c36aeefb65078f894','SmolLM3-Q4_K_M.gguf'),
 },
 {
  id:'qwen3-vl-4b-q4km',name:'Qwen3‑VL · 4B',badge:'Sharper + images',description:'The best answers and image reading Brief offers — but slower and much heavier. For recent phones with free storage.',
  fileName:'Qwen3VL-4B-Instruct-Q4_K_M.gguf',repo:'Qwen/Qwen3-VL-4B-Instruct-GGUF',revision:'1cd86afb9a95c410a6038ab3b40d8b578c892266',
  sizeLabel:'about 3.0 GB total',bytes:2_497_281_664,
  license:'Apache 2.0',url:file('Qwen/Qwen3-VL-4B-Instruct-GGUF','1cd86afb9a95c410a6038ab3b40d8b578c892266','Qwen3VL-4B-Instruct-Q4_K_M.gguf'),
  projector:{fileName:'mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf',url:file('Qwen/Qwen3-VL-4B-Instruct-GGUF','1cd86afb9a95c410a6038ab3b40d8b578c892266','mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf'),bytes:453_974_304},
 },
];
