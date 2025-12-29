
import React, { useState, useEffect } from 'react';
import { Unit, ColorMode, AlbumConfig, SavedProject, AlbumPreset } from '../types';
import { Plus, Clock, FolderOpen, FileImage, Bookmark, Trash2 } from 'lucide-react';

interface WelcomeScreenProps {
  onCreateProject: (config: AlbumConfig) => void;
  onOpenProject: (file: File) => void;
  savedProjects: SavedProject[];
  onLoadSavedProject: (project: SavedProject) => void;
}

const PRESETS_STORAGE_KEY = 'album_architect_presets';

const defaultPresets: AlbumPreset[] = [
    { id: '1', name: 'Álbum Quadrado', width: 30, height: 30, unit: 'cm', dpi: 300 },
    { id: '2', name: 'Álbum Paisagem', width: 40, height: 30, unit: 'cm', dpi: 300 },
    { id: '3', name: 'Álbum Retrato', width: 20, height: 30, unit: 'cm', dpi: 300 },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onCreateProject, 
  onOpenProject,
  savedProjects,
  onLoadSavedProject
}) => {
  const [width, setWidth] = useState<number>(30);
  const [height, setHeight] = useState<number>(30);
  const [unit, setUnit] = useState<Unit>('cm');
  const [dpi, setDpi] = useState<number>(300);
  const [colorMode, setColorMode] = useState<ColorMode>('RGB');
  const [projectName, setProjectName] = useState('Meu Novo Álbum');
  
  const [presets, setPresets] = useState<AlbumPreset[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (saved) {
        setPresets(JSON.parse(saved));
      } else {
        setPresets(defaultPresets);
      }
    } catch (e) {
      console.error("Failed to load presets", e);
      setPresets(defaultPresets);
    }
  }, []);

  const savePresets = (newPresets: AlbumPreset[]) => {
    setPresets(newPresets);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
  };

  const applyPreset = (preset: AlbumPreset) => {
    setWidth(preset.width);
    setHeight(preset.height);
    setUnit(preset.unit);
    setDpi(preset.dpi);
  };

  const handleSavePreset = () => {
    const name = prompt("Digite um nome para a predefinição:", `Meu Padrão ${width}x${height}`);
    if (name) {
      const newPreset: AlbumPreset = {
        id: Date.now().toString(),
        name,
        width,
        height,
        unit,
        dpi
      };
      savePresets([...presets, newPreset]);
    }
  };
  
  const handleDeletePreset = (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir esta predefinição?")) {
          savePresets(presets.filter(p => p.id !== id));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let pxWidth = width;
    let pxHeight = height;

    if (unit === 'cm') {
      pxWidth = (width / 2.54) * dpi;
      pxHeight = (height / 2.54) * dpi;
    } else if (unit === 'mm') {
      pxWidth = (width / 25.4) * dpi;
      pxHeight = (height / 25.4) * dpi;
    }

    onCreateProject({
      projectName,
      spreadWidth: Math.round(pxWidth),
      spreadHeight: Math.round(pxHeight),
      dpi,
      displayUnit: unit,
      colorMode,
      gap: 40,
      margin: 100
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onOpenProject(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-blue-500 mb-2">IsAlbum Pro</h1>
        <p className="text-gray-400">Crie álbuns profissionais em minutos.</p>
      </div>
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12">
        
        <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-2xl space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-400" />
            Novo Projeto
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nome do Projeto</label>
            <input 
              type="text" 
              required
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Largura</label>
              <input type="number" step="0.1" required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none" value={width} onChange={(e) => setWidth(Number(e.target.value))} />
             </div>
             <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Altura</label>
              <input type="number" step="0.1" required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none" value={height} onChange={(e) => setHeight(Number(e.target.value))} />
             </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Unidade</label>
              <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
                <option value="cm">cm</option>
                <option value="mm">mm</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">DPI</label>
              <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none" value={dpi} onChange={(e) => setDpi(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Cor</label>
              <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none" value={colorMode} onChange={(e) => setColorMode(e.target.value as ColorMode)}>
                <option value="RGB">RGB</option>
                <option value="CMYK">CMYK</option>
              </select>
            </div>
          </div>

          <button type="button" onClick={handleSavePreset} className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-medium py-2 rounded-lg transition-colors text-sm">
             <Bookmark size={14} /> Salvar Predefinição
          </button>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">
            Criar Projeto
          </button>
          
          <div className="relative pt-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-900 text-gray-500">Ou abrir existente</span></div>
          </div>

          <label className="flex items-center justify-center w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 rounded-lg cursor-pointer border border-gray-700 transition-colors">
            <FolderOpen className="w-4 h-4 mr-2" />
            Abrir Arquivo .aaproj
            <input type="file" accept=".aaproj" className="hidden" onChange={handleFileChange} />
          </label>

        </form>

        <div className="flex flex-col space-y-8">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-300 mb-4">
                <Bookmark className="w-5 h-5" /> Predefinições
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {presets.map(p => (
                  <button key={p.id} onClick={() => applyPreset(p)} className="bg-gray-800 p-3 rounded-lg text-left hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-all group relative">
                    <div className="font-semibold text-gray-200">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.width}x{p.height} {p.unit} @ {p.dpi}dpi</div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeletePreset(p.id); }} className="absolute top-1 right-1 p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={12} />
                    </button>
                  </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-300 mb-4">
              <Clock className="w-5 h-5" /> Recentes
            </h2>
            {savedProjects.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {savedProjects.slice(0, 4).map((proj) => (
                    <div key={proj.id} onClick={() => onLoadSavedProject(proj)} className="bg-gray-800 border border-gray-700 hover:border-blue-500 rounded-lg p-3 cursor-pointer transition-all hover:shadow-lg group flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                        <FileImage className="w-5 h-5 text-gray-400 group-hover:text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm text-gray-200 truncate">{proj.name}</h3>
                        <span className="text-xs text-gray-500">{new Date(proj.lastModified).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
            ) : (
               <div className="flex flex-col items-center justify-center text-center text-gray-600 bg-gray-900/50 border border-dashed border-gray-800 rounded-lg py-10">
                  <FolderOpen className="w-8 h-8 mb-2" />
                  <p className="text-sm">Nenhum projeto recente encontrado.</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
