import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { LayoutDashboard, PackagePlus, Truck, Settings, AlertTriangle, Wrench, ClipboardList, ShoppingCart, UserPlus, Undo2, Trash2, ImagePlus, Camera, Plus, X, Search, ShieldCheck, Menu, Box } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

const api = axios.create({ baseURL: 'https://estoque-api-7l82.onrender.com/api' });

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [menuAberto, setMenuAberto] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [estoqueTecnicos, setEstoqueTecnicos] = useState([]);
  const [logs, setLogs] = useState([]);
  const [previsao, setPrevisao] = useState([]);
  const [dashboard, setDashboard] = useState({ kpis: {}, grafico: [], tecnicos: [] });
  
  const notificadoRef = useRef(new Set());

  const fetchData = async () => {
    try {
      const [prodRes, techRes, dashRes, estTechRes, logsRes, prevRes] = await Promise.all([
        api.get('/produtos'), api.get('/tecnicos'), api.get('/dashboard'),
        api.get('/estoque-tecnicos'), api.get('/logs'), api.get('/previsao-compras')
      ]);
      setProdutos(prodRes.data); setTecnicos(techRes.data); setDashboard(dashRes.data);
      setEstoqueTecnicos(estTechRes.data); setLogs(logsRes.data); setPrevisao(prevRes.data);
    } catch (error) { console.error("Erro ao buscar dados", error); }
  };

  useEffect(() => {
    if (Notification.permission === "default") Notification.requestPermission();
    fetchData();
  }, []);

  // ALERTA INTELIGENTE POR CATEGORIA
  const categoriasMatriz = {};
  produtos.forEach(p => {
    const cat = p.categoria || 'RASTREADOR';
    if (!categoriasMatriz[cat]) categoriasMatriz[cat] = { quantidade: 0, minimo: p.estoque_minimo };
    categoriasMatriz[cat].quantidade += Number(p.quantidade_matriz);
    categoriasMatriz[cat].minimo = Math.max(categoriasMatriz[cat].minimo, p.estoque_minimo);
  });

  const alertasMatriz = Object.keys(categoriasMatriz)
    .filter(cat => categoriasMatriz[cat].quantidade <= categoriasMatriz[cat].minimo)
    .map(cat => ({ categoria: cat, quantidade: categoriasMatriz[cat].quantidade, minimo: categoriasMatriz[cat].minimo }));

  const categoriasTecnicos = {};
  estoqueTecnicos.forEach(et => {
    const cat = et.categoria || 'RASTREADOR';
    const key = `${et.tecnico_id}-${cat}`;
    if (!categoriasTecnicos[key]) {
      categoriasTecnicos[key] = {
        tecnico_id: et.tecnico_id, tecnico_nome: et.tecnico_nome, categoria: cat, quantidade: 0, minimo: et.estoque_minimo
      };
    }
    categoriasTecnicos[key].quantidade += Number(et.quantidade);
  });

  const alertasTecnicos = Object.values(categoriasTecnicos)
    .filter(ct => ct.quantidade <= ct.minimo && ct.quantidade > 0);

  useEffect(() => {
    if (Notification.permission === "granted") {
      alertasMatriz.forEach(a => {
        const key = `matriz-${a.categoria}-${a.quantidade}`;
        if (!notificadoRef.current.has(key)) {
          new Notification("Alerta Matriz (Categoria)", { body: `Atenção: A categoria ${a.categoria} está com saldo baixo (${a.quantidade} restantes no total).` });
          notificadoRef.current.add(key);
        }
      });
      alertasTecnicos.forEach(a => {
        const key = `tec-${a.tecnico_id}-${a.categoria}-${a.quantidade}`;
        if (!notificadoRef.current.has(key)) {
          new Notification("Alerta Técnico", { body: `O técnico ${a.tecnico_nome} tem poucas unidades de ${a.categoria} (${a.quantidade} restantes).` });
          notificadoRef.current.add(key);
        }
      });
    }
  }, [produtos, estoqueTecnicos]);

  useEffect(() => {
    let buffer = '';
    const secretCode = 'resetzenseguros';
    const handleKeyDown = (e) => {
      if (e.key.length === 1) {
        buffer += e.key.toLowerCase();
        if (buffer.length > secretCode.length) buffer = buffer.slice(-secretCode.length);
        if (buffer === secretCode) {
          buffer = ''; 
          if (window.confirm('⚠️ EASTER EGG ATIVADO: Deseja zerar todo o estoque?')) {
            api.post('/reset').then(() => { alert('Sistema resetado com sucesso!'); window.location.reload(); }).catch(() => alert('Erro ao resetar.'));
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const changeTab = (tab) => { setActiveTab(tab); setMenuAberto(false); };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {menuAberto && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setMenuAberto(false)} />}

      {/* MENU LATERAL SLIDE-OUT PARA MOBILE */}
      <aside className={`fixed inset-y-0 left-0 transform ${menuAberto ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 w-72 bg-slate-900 text-white flex flex-col z-50 transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none`}>
        <div className="p-6 text-2xl font-bold border-b border-slate-800 flex justify-between items-center">
          <span>Estoque <span className="text-blue-500">Pro</span></span>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setMenuAberto(false)}><X size={28} /></button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto pb-20">
          <MenuButton icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => changeTab('dashboard')} />
          <MenuButton icon={<PackagePlus />} label="Entrada Matriz" active={activeTab === 'entrada'} onClick={() => changeTab('entrada')} />
          <MenuButton icon={<Truck />} label="Carga p/ Técnico" active={activeTab === 'transferencia'} onClick={() => changeTab('transferencia')} />
          <MenuButton icon={<Wrench />} label="Baixa (Instalação)" active={activeTab === 'instalacao'} onClick={() => changeTab('instalacao')} />
          <MenuButton icon={<Undo2 />} label="Correções (Estornos)" active={activeTab === 'estorno'} onClick={() => changeTab('estorno')} />
          <MenuButton icon={<Search />} label="Controle IMEI & Triagem" active={activeTab === 'rastreio'} onClick={() => changeTab('rastreio')} />
          <MenuButton icon={<Box />} label="Cadastrar Equipamentos" active={activeTab === 'equipamentos'} onClick={() => changeTab('equipamentos')} />
          <MenuButton icon={<ShoppingCart />} label="Previsão Compras" active={activeTab === 'compras'} onClick={() => changeTab('compras')} />
          <MenuButton icon={<UserPlus />} label="Equipe (Técnicos)" active={activeTab === 'tecnicos'} onClick={() => changeTab('tecnicos')} />
          <MenuButton icon={<ClipboardList />} label="Histórico (Logs)" active={activeTab === 'logs'} onClick={() => changeTab('logs')} />
          <MenuButton icon={<Settings />} label="Configurações" active={activeTab === 'config'} onClick={() => changeTab('config')} />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        <header className="lg:hidden bg-slate-900 text-white p-4 flex items-center shadow-md">
          <button onClick={() => setMenuAberto(true)} className="mr-4 focus:outline-none"><Menu size={28} /></button>
          <h1 className="text-xl font-bold">Estoque Pro</h1>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto pb-24">
          
          {(alertasMatriz.length > 0 || alertasTecnicos.length > 0) && (
            <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
              <div className="flex items-center text-red-800 font-bold mb-2"><AlertTriangle className="mr-2" /> Atenção: Níveis Críticos de Estoque</div>
              <ul className="ml-8 text-red-700 list-disc text-sm space-y-1">
                {alertasMatriz.map(a => <li key={`m-${a.categoria}`}><strong>Matriz ({a.categoria}):</strong> Restam apenas {a.quantidade} no total (Mínimo: {a.minimo})</li>)}
                {alertasTecnicos.map(a => <li key={`t-${a.tecnico_id}-${a.categoria}`}><strong>{a.tecnico_nome} ({a.categoria}):</strong> Restam apenas {a.quantidade} em posse (Mínimo: {a.minimo})</li>)}
              </ul>
            </div>
          )}

          {activeTab === 'dashboard' && <TelaDashboard data={dashboard} />}
          {activeTab === 'entrada' && <TelaEntrada produtos={produtos} reload={fetchData} />}
          {activeTab === 'transferencia' && <TelaTransferencia produtos={produtos} tecnicos={tecnicos} reload={fetchData} />}
          {activeTab === 'instalacao' && <TelaInstalacao produtos={produtos} tecnicos={tecnicos} estoque={estoqueTecnicos} reload={fetchData} />}
          {activeTab === 'estorno' && <TelaEstorno produtos={produtos} tecnicos={tecnicos} estoque={estoqueTecnicos} reload={fetchData} />}
          {activeTab === 'rastreio' && <TelaRastreioTriagem reload={fetchData} />}
          {activeTab === 'equipamentos' && <TelaEquipamentos produtos={produtos} reload={fetchData} />}
          {activeTab === 'compras' && <TelaCompras previsao={previsao} produtos={produtos} />}
          {activeTab === 'tecnicos' && <TelaTecnicos tecnicos={tecnicos} estoque={estoqueTecnicos} reload={fetchData} />}
          {activeTab === 'logs' && <TelaLogs logs={logs} />}
          {activeTab === 'config' && <TelaConfiguracao produtos={produtos} tecnicos={tecnicos} reload={fetchData} />}
        </div>
      </main>
    </div>
  );
}

function MenuButton({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center p-3 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
      {icon} <span className="ml-3 text-sm">{label}</span>
    </button>
  );
}

// CÂMERA AO VIVO COM FIX DE PERFORMANCE E BLOQUEIO DE PISCAR
function LeitorSeriais({ seriais, setSeriais }) {
  const [inputManual, setInputManual] = useState('');
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [processandoFoto, setProcessandoFoto] = useState(false);

  useEffect(() => {
    let scanner = null;
    if (cameraAtiva) {
      scanner = new Html5QrcodeScanner("reader-camera", { fps: 10, qrbox: { width: 250, height: 150 }, rememberLastUsedCamera: true }, false);
      scanner.render((decodedText) => adicionarSerial(decodedText), () => {});
    }
    return () => { if (scanner) scanner.clear().catch(e => console.error("Erro ao limpar câmera:", e)); };
  }, [cameraAtiva]);

  const adicionarSerial = (codigo) => {
    const formatado = codigo.trim();
    if (!formatado) return;
    
    setSeriais(prev => {
      if (prev.includes(formatado)) return prev; 
      const audio = new Audio('https://www.soundjay.com/buttons/sounds/beep-07a.mp3');
      audio.play().catch(() => {});
      return [formatado, ...prev]; 
    });
    setInputManual('');
  };

  const handleUploadFotos = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setProcessandoFoto(true);
    const html5QrCode = new Html5Qrcode("file-reader-hidden");
    let falhas = 0;
    for (let i = 0; i < files.length; i++) {
      try { const resultado = await html5QrCode.scanFile(files[i], true); adicionarSerial(resultado); } catch (err) { falhas++; }
    }
    setProcessandoFoto(false);
    e.target.value = '';
    if (falhas > 0) alert(`${falhas} foto(s) não possuía(m) um código legível.`);
  };

  return (
    <div className="pt-4 border-t flex flex-col gap-3">
      <div id="file-reader-hidden" style={{ display: 'none' }}></div>
      <div className="flex flex-col md:flex-row gap-3">
        {!cameraAtiva ? (
          <button type="button" onClick={() => setCameraAtiva(true)} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl flex justify-center items-center transition"><Camera className="mr-2" /> Câmera ao Vivo</button>
        ) : (
          <div className="w-full mb-2">
            <button type="button" onClick={() => setCameraAtiva(false)} className="mb-2 text-red-500 font-bold flex items-center justify-center w-full bg-red-50 p-2 rounded-lg"><X size={20} className="mr-1"/> Fechar Câmera</button>
            <div id="reader-camera" className="w-full overflow-hidden rounded-xl border-2 border-dashed border-blue-400 bg-black text-white"></div>
          </div>
        )}
        <label className={`flex-1 ${processandoFoto ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'} text-white font-bold py-4 rounded-xl flex justify-center items-center transition shadow-sm`}>
          {processandoFoto ? 'Analisando...' : <><ImagePlus className="mr-2" /> Enviar Fotos (Lote)</>}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadFotos} disabled={processandoFoto} />
        </label>
      </div>
      <div className="pt-2 flex gap-2">
        <input type="text" placeholder="Ou digite o IMEI/QR Code..." className="flex-1 p-4 border border-gray-300 rounded-xl bg-gray-50 text-lg" value={inputManual} onChange={e => setInputManual(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionarSerial(inputManual))} />
        <button type="button" onClick={() => adicionarSerial(inputManual)} className="bg-slate-200 text-slate-700 p-4 rounded-xl hover:bg-slate-300 font-bold"><Plus size={24}/></button>
      </div>
    </div>
  );
}

function SidebarConferencia({ seriais, setSeriais, submit, disabled, labelBtn, corBtn }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-fit">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Itens Prontos ({seriais.length})</h3>
      <p className="text-sm text-gray-500 mb-4">Confira os números antes de concluir.</p>
      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 max-h-[350px] min-h-[200px]">
        {seriais.length === 0 ? (<div className="h-full flex items-center justify-center text-slate-400 italic">Vazio.</div>) : (
          <ul className="space-y-2">
            {seriais.map((codigo, index) => (
              <li key={codigo} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center font-mono text-sm break-all">
                <span><span className="text-blue-500 font-bold mr-2">#{seriais.length - index}</span> {codigo}</span>
                <button type="button" onClick={() => setSeriais(seriais.filter(s => s !== codigo))} className="text-red-400 hover:text-red-600 p-2"><X size={20}/></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button onClick={submit} disabled={disabled} className={`w-full font-bold py-4 rounded-xl text-white transition-all shadow-md text-lg ${disabled ? 'bg-gray-300 shadow-none' : corBtn}`}>{labelBtn}</button>
    </div>
  );
}

function TelaEquipamentos({ produtos, reload }) {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('RASTREADOR');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const catExistente = produtos.find(p => p.categoria === categoria);
      const minSugerido = catExistente ? catExistente.estoque_minimo : 5;
      await api.post('/produtos', { nome, categoria, estoque_minimo: minSugerido });
      alert('Equipamento cadastrado com sucesso!'); setNome(''); reload();
    } catch (err) { alert('Erro ao cadastrar equipamento.'); }
  };
  
  const removerEquipamento = async (id, nomeEquip) => {
    if (window.confirm(`Tem certeza que deseja remover o modelo ${nomeEquip}?`)) { 
      try { await api.delete(`/produtos/${id}`); alert('Removido!'); reload(); } 
      catch (err) { alert(err.response?.data?.error || 'Erro ao remover.'); } 
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-1/3 bg-white p-8 rounded-xl shadow-sm border border-gray-100 h-fit">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Box className="mr-2"/> Novo Modelo</h2>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome do Modelo (Ex: NT40)</label><input required className="w-full p-4 border border-gray-300 rounded-xl bg-gray-50" value={nome} onChange={e => setNome(e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoria do Aparelho</label>
            <select className="w-full p-4 border border-gray-300 rounded-xl bg-gray-50 font-bold text-blue-800" value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="RASTREADOR">Rastreador</option><option value="TAG">Tag</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl mt-2">Cadastrar Modelo</button>
        </form>
      </div>
      <div className="flex-1 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Modelos no Sistema</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead><tr className="bg-gray-50 text-gray-600 text-sm"><th className="p-4 border-b">Categoria</th><th className="p-4 border-b">Nome do Modelo</th><th className="p-4 border-b text-center">Ações</th></tr></thead>
            <tbody>{produtos.map(p => (
              <tr key={p.id} className="border-b text-sm hover:bg-gray-50">
                <td className="p-4"><span className="bg-blue-100 text-blue-800 py-1 px-2 rounded-lg font-bold text-xs">{p.categoria || 'OUTROS'}</span></td>
                <td className="p-4 font-medium">{p.nome}</td>
                <td className="p-4 text-center"><button onClick={() => removerEquipamento(p.id, p.nome)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={20} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TelaEntrada({ produtos, reload }) {
  const [produtoId, setProdutoId] = useState(''); const [seriais, setSeriais] = useState([]);
  const submit = async (e) => { e.preventDefault(); try { await api.post('/entrada', { produto_id: produtoId, seriais }); alert(`${seriais.length} registrados!`); setSeriais([]); setProdutoId(''); reload(); } catch (err) { alert('Erro.'); } };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100"><h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><PackagePlus className="mr-2"/> Entrada (Matriz)</h2>
        <div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700">Vincular IMEIs ao Modelo:</label><select className="mt-1 w-full p-4 border border-gray-300 rounded-xl" value={produtoId} onChange={e => setProdutoId(e.target.value)}><option value="">Selecione o modelo que chegou...</option>{produtos.map(p => <option key={p.id} value={p.id}>[{p.categoria || 'EQUIP'}] {p.nome}</option>)}</select></div><LeitorSeriais seriais={seriais} setSeriais={setSeriais} /></div>
      </div>
      <SidebarConferencia seriais={seriais} setSeriais={setSeriais} submit={submit} disabled={!produtoId || seriais.length === 0} labelBtn="Confirmar Entrada" corBtn="bg-emerald-600" />
    </div>
  );
}

function TelaTransferencia({ produtos, tecnicos, reload }) {
  const [tecnicoId, setTecnicoId] = useState(''); const [produtoId, setProdutoId] = useState(''); const [seriais, setSeriais] = useState([]);
  const submit = async (e) => { e.preventDefault(); try { await api.post('/transferir', { tecnico_id: tecnicoId, produto_id: produtoId, seriais }); alert('Transferência concluída!'); setSeriais([]); reload(); } catch (err) { alert('Erro.'); } };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100"><h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Truck className="mr-2"/> Transferir para Técnico</h2>
        <div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700">Técnico:</label><select className="mt-1 w-full p-4 border border-gray-300 rounded-xl" value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}><option value="">Selecione...</option>{tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div><div><label className="block text-sm font-medium text-gray-700">Qual modelo ele vai levar?</label><select className="mt-1 w-full p-4 border border-gray-300 rounded-xl" value={produtoId} onChange={e => setProdutoId(e.target.value)}><option value="">Selecione...</option>{produtos.map(p => <option key={p.id} value={p.id}>[{p.categoria}] {p.nome} (Disp: {p.quantidade_matriz})</option>)}</select></div></div><LeitorSeriais seriais={seriais} setSeriais={setSeriais} /></div>
      </div>
      <SidebarConferencia seriais={seriais} setSeriais={setSeriais} submit={submit} disabled={!produtoId || !tecnicoId || seriais.length === 0} labelBtn="Executar Transferência" corBtn="bg-blue-600" />
    </div>
  );
}

function TelaInstalacao({ produtos, tecnicos, estoque, reload }) {
  const [tecnicoId, setTecnicoId] = useState(''); const [produtoId, setProdutoId] = useState(''); const [seriais, setSeriais] = useState([]);
  const prodDoTecnico = estoque.filter(et => et.tecnico_id === Number(tecnicoId) && et.quantidade > 0);
  const submit = async (e) => { e.
