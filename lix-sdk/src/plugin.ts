export type Plugin = {
  name: string;
  glob: string;
  onFileChange: (file: any) => void;
};
