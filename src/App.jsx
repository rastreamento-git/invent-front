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

  // ==========================================
  // LÓGICA INTELIGENTE DE AGREGAÇÃO POR CATEGORIA
  // ==========================================
  
  // 1. Matriz: Soma as quantidades por Categoria
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

  // 2. Técnicos: Soma as quantidades na posse do técnico por Categoria
  const categoriasTecnicos = {};
  estoqueTecnicos.forEach(et => {
    const cat = et.categoria || 'RASTREADOR';
    const key = `${et.tecnico_id}-${cat}`;
    if (!categoriasTecnicos[key]) {
      categoriasTecnicos[key] = {
        tecnico_id: et.tecnico_id,
        tecnico_nome: et.tecnico_nome,
        categoria: cat,
        quantidade: 0,
        minimo: et.estoque_minimo // O mínimo do técnico vem da tabela de técnicos
      };
    }
    categoriasTecnicos[key].quantidade += Number(et.quantidade);
  });

  const alertasTecnicos = Object.values(categoriasTecnicos)
    .filter(ct => ct.quantidade <= ct.minimo && ct.quantidade > 0);

  // 3. Dispara notificações agregadas
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
  }, [produtos, estoqueTecnicos]); // Atualiza as notificações apenas quando os dados base mudam

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
            api.post('/reset').then(() => {
              alert('Sistema resetado com sucesso!');
              window.location.reload(); 
            }).catch(() => alert('Erro ao resetar o sistema.'));
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const changeTab = (tab) => {
    setActiveTab(tab);
    setMenuAberto(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {menuAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setMenuAberto(false)} />
      )}

      {/* MENU LATERAL SLIDE-OUT PARA MOBILE */}
      <aside className={`fixed inset-y-0 left-0 transform ${menuAberto ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 w-72 bg-slate-900 text-white flex flex-col z-50 transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none`}>
        <div className="p-6 text-2xl font-bold border-b border-slate-800 flex justify-between items-center">
          <span>Estoque <span className="text-blue-500">Pro</span></span>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setMenuAberto(false)}>
            <X size={28} />
          </button>
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
          <button onClick={() => setMenuAberto(true)} className="mr-4 focus:outline-none">
            <Menu size={28} />
          </button>
          <h1 className="text-xl font-bold">Estoque Pro</h1>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto pb-24">
          
          {/* BANNER DE ALERTA AGREGADO POR CATEGORIA */}
          {(alertasMatriz.length > 0 || alertasTecnicos.length > 0) && (
            <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
              <div className="flex items-center text-red-800 font-bold mb-2"><AlertTriangle className="mr-2" /> Atenção: Níveis Críticos de Estoque</div>
              <ul className="ml-8 text-red-700 list-disc text-sm space-y-1">
                {alertasMatriz.map(a => <li key={`m-${a.categoria}`}><strong>Matriz ({a.categoria}):</strong> Restam apenas {a.quantidade} no total (Mínimo configurado: {a.minimo})</li>)}
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
          {activeTab === 'compras' && <TelaCompras previsao={previsao} />}
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

function LeitorSeriais({ seriais, setSeriais }) {
  const [inputManual, setInputManual] = useState('');
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [processandoFoto, setProcessandoFoto] = useState(false);

  useEffect(() => {
    if (cameraAtiva) {
      const scanner = new Html5QrcodeScanner("reader-camera", { fps: 10, qrbox: { width: 250, height: 150 } }, false);
      scanner.render((decodedText) => adicionarSerial(decodedText), () => {});
      return () => scanner.clear().catch(e => console.error("Erro ao limpar câmera:", e));
    }
  }, [cameraAtiva, seriais]);

  const adicionarSerial = (codigo) => {
    const formatado = codigo.trim();
    if (!formatado || seriais.includes(formatado)) return;
    const audio = new Audio('https://www.soundjay.com/buttons/sounds/beep-07a.mp3');
    audio.play().catch(() => {});
    setSeriais(prev => [formatado, ...prev]);
    setInputManual('');
  };

  const handleUploadFotos = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setProcessandoFoto(true);
    const html5QrCode = new Html5Qrcode("file-reader-hidden");
    let falhas = 0;
    for (let i = 0; i < files.length; i++) {
      try {
        const resultado = await html5QrCode.scanFile(files[i], true);
        adicionarSerial(resultado);
      } catch (err) { falhas++; }
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
            <div id="reader-camera" className="w-full overflow-hidden rounded-xl border-2 border-dashed border-blue-400"></div>
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

// ==========================================
// TELA DE EQUIPAMENTOS (Sem pedir o Alerta Mínimo)
// ==========================================
function TelaEquipamentos({ produtos, reload }) {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('RASTREADOR');

  const submit = async (e) => {
    e.preventDefault();
    try {
      // Procura se já existe algum item dessa categoria para herdar a regra de mínimo
      const catExistente = produtos.find(p => p.categoria === categoria);
      const minSugerido = catExistente ? catExistente.estoque_minimo : 5;

      await api.post('/produtos', { nome, categoria, estoque_minimo: minSugerido });
      alert('Equipamento cadastrado com sucesso!');
      setNome(''); reload();
    } catch (err) { alert('Erro ao cadastrar equipamento.'); }
  };
  
  const removerEquipamento = async (id, nomeEquip) => {
    if (window.confirm(`Tem certeza que deseja remover o modelo ${nomeEquip}?`)) { 
      try { await api.delete(`/produtos/${id}`); alert('Removido com sucesso!'); reload(); } 
      catch (err) { alert(err.response?.data?.error || 'Erro ao remover equipamento.'); } 
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-1/3 bg-white p-8 rounded-xl shadow-sm border border-gray-100 h-fit">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Box className="mr-2"/> Novo Modelo</h2>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome do Modelo</label><input required placeholder="Ex: NT40" className="w-full p-4 border border-gray-300 rounded-xl bg-gray-50" value={nome} onChange={e => setNome(e.target.value)} /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria do Aparelho</label>
            <select className="w-full p-4 border border-gray-300 rounded-xl bg-gray-50 font-bold text-blue-800" value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="RASTREADOR">Rastreador</option>
              <option value="TAG">Tag</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl mt-2">Cadastrar Modelo</button>
        </form>
      </div>
      <div className="flex-1 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Lista de Modelos Registrados</h2>
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
        <div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700">Qual modelo chegou?</label><select className="mt-1 w-full p-4 border border-gray-300 rounded-xl" value={produtoId} onChange={e => setProdutoId(e.target.value)}><option value="">Selecione...</option>{produtos.map(p => <option key={p.id} value={p.id}>[{p.categoria || 'EQUIP'}] {p.nome}</option>)}</select></div><LeitorSeriais seriais={seriais} setSeriais={setSeriais} /></div>
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
  const submit = async (e) => { e.preventDefault(); try { await api.post('/instalar', { tecnico_id: tecnicoId, produto_id: produtoId, seriais }); alert('Instalação registrada!'); setSeriais([]); reload(); } catch (err) { alert('Erro.'); } };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100"><h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Wrench className="mr-2"/> Registrar Instalação</h2>
        <div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700">Técnico:</label><select className="mt-1 w-full p-4 border border-gray-300 rounded-xl" value={tecnicoId} onChange={e => {setTecnicoId(e.target.value); setProdutoId('');}}><option value="">Selecione...</option>{tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div><div><label className="block text-sm font-medium text-gray-700">Qual modelo ele instalou?</label><select className="mt-1 w-full p-4 border border-gray-300 rounded-xl" value={produtoId} onChange={e => setProdutoId(e.target.value)} disabled={!tecnicoId}><option value="">{tecnicoId ? 'Selecione...' : 'Selecione o técnico'}</option>{prodDoTecnico.map(et => <option key={et.produto_id} value={et.produto_id}>{et.produto_nome} (Posse: {et.quantidade})</option>)}</select></div></div><LeitorSeriais seriais={seriais} setSeriais={setSeriais} /></div>
      </div>
      <SidebarConferencia seriais={seriais} setSeriais={setSeriais} submit={submit} disabled={!produtoId || !tecnicoId || seriais.length === 0} labelBtn="Confirmar Instalação" corBtn="bg-emerald-600" />
    </div>
  );
}

function TelaEstorno({ produtos, tecnicos, estoque, reload }) {
  const [tipo, setTipo] = useState('MATRIZ'); const [produtoId, setProdutoId] = useState(''); const [tecnicoId, setTecnicoId] = useState(''); const [seriais, setSeriais] = useState([]);
  const submit = async (e) => { e.preventDefault(); if (confirm(`Estornar ${seriais.length} equipamento(s)?`)) { try { await api.post('/estorno', { tipo_estorno: tipo, produto_id: produtoId, tecnico_id: tecnicoId, seriais }); alert('Estornado com sucesso.'); setSeriais([]); reload(); } catch (err) { alert('Erro no estorno.'); } } };
  const estoqueFiltrado = tipo === 'TECNICO' ? estoque.filter(e => e.tecnico_id === Number(tecnicoId)) : [];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100"><h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center text-red-600"><Undo2 className="mr-2"/> Correção / Devolução</h2>
        <div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700">Ação de Correção:</label><select className="mt-1 w-full p-4 border border-gray-300 rounded-xl" value={tipo} onChange={e => {setTipo(e.target.value); setProdutoId(''); setTecnicoId('');}}><option value="MATRIZ">Remover da Matriz</option><option value="TECNICO">Devolução do Técnico p/ Matriz</option></select></div>{tipo === 'TECNICO' && (<div><label className="block text-sm font-medium text-gray-700">Técnico:</label><select className="mt-1 w-full p-4 border border-gray-300 rounded-xl" value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}><option value="">Selecione...</option>{tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>)}<div><label className="block text-sm font-medium text-gray-700">Qual modelo será devolvido?</label><select className="mt-1 w-full p-4 border border-gray-300 rounded-xl" value={produtoId} onChange={e => setProdutoId(e.target.value)} disabled={tipo === 'TECNICO' && !tecnicoId}><option value="">Selecione...</option>{tipo === 'MATRIZ' ? produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>) : estoqueFiltrado.map(et => <option key={et.produto_id} value={et.produto_id}>{et.produto_nome} (Posse: {et.quantidade})</option>)}</select></div><LeitorSeriais seriais={seriais} setSeriais={setSeriais} /></div>
      </div>
      <SidebarConferencia seriais={seriais} setSeriais={setSeriais} submit={submit} disabled={!produtoId || (tipo === 'TECNICO' && !tecnicoId) || seriais.length === 0} labelBtn="Executar Estorno" corBtn="bg-red-600" />
    </div>
  );
}

function TelaRastreioTriagem({ reload }) {
  const [imeis, setImeis] = useState([]); const [seriaisRecebidos, setSeriaisRecebidos] = useState([]); const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const carregarImeis = async () => { const res = await api.get('/imeis'); setImeis(res.data); };
  useEffect(() => { carregarImeis(); }, []);
  const enviarParaTriagem = async (e) => { e.preventDefault(); try { await api.post('/triagem/receber', { seriais: seriaisRecebidos }); alert('Enviado para Triagem!'); setSeriaisRecebidos([]); carregarImeis(); reload(); } catch(err) { alert('Erro.'); } };
  const avaliar = async (codigo_serial, produto_id, aprovado) => { if (window.confirm(aprovado ? "APROVAR Reuso?" : "Mandar para SUCATA?")) { await api.post('/triagem/avaliar', { codigo_serial, produto_id, aprovado }); carregarImeis(); reload(); } };
  const limparAntigos = async () => { if (window.confirm("Remover instalados +30 dias?")) { const res = await api.delete('/limpeza-instalados'); alert(`${res.data.apagados} apagados.`); carregarImeis(); } };
  const imeisFiltrados = filtroStatus === 'TODOS' ? imeis : imeis.filter(i => i.status === filtroStatus);
  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 lg:grid-cols-2 gap-8"><div><h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center"><ShieldCheck className="mr-2 text-orange-500"/> RMA / Triagem</h2><p className="text-sm text-gray-500 mb-6">Receba equipamentos defeituosos.</p><LeitorSeriais seriais={seriaisRecebidos} setSeriais={setSeriaisRecebidos} /></div><SidebarConferencia seriais={seriaisRecebidos} setSeriais={setSeriaisRecebidos} submit={enviarParaTriagem} disabled={seriaisRecebidos.length === 0} labelBtn="Mandar para Triagem" corBtn="bg-orange-500" /></div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="p-6 border-b border-gray-100 bg-slate-50 flex justify-between items-center flex-wrap gap-4"><h2 className="text-xl font-bold text-gray-800 flex items-center"><Search className="mr-2"/> Rastreabilidade</h2><div className="flex items-center gap-4"><button onClick={limparAntigos} className="text-sm bg-white border px-4 py-2 rounded-md">Limpar (+30 dias)</button><select className="p-2 border rounded-md font-bold" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}><option value="TODOS">Ver Todos</option><option value="MATRIZ">Matriz</option><option value="TECNICO">Com Técnico</option><option value="INSTALADO">Instalados</option><option value="TRIAGEM">Na Triagem</option><option value="SUCATA">Sucata</option></select></div></div>
        <div className="overflow-x-auto max-h-[500px]"><table className="w-full text-left whitespace-nowrap"><thead className="sticky top-0 bg-gray-100"><tr className="text-gray-600 text-sm"><th className="p-4">IMEI / QR</th><th className="p-4">Equipamento</th><th className="p-4">Status</th><th className="p-4">Atualização</th><th className="p-4 text-center">Ações</th></tr></thead><tbody>{imeisFiltrados.map((i) => (<tr key={i.codigo_serial} className="border-b text-sm"><td className="p-4 font-mono font-bold text-blue-600">{i.codigo_serial}</td><td className="p-4 font-medium">[{i.categoria || 'EQUIP'}] {i.produto}</td><td className="p-4">{i.status}</td><td className="p-4">{new Date(i.data_atualizacao).toLocaleString('pt-BR')}</td><td className="p-4 text-center">{i.status === 'TRIAGEM' ? (<div className="flex justify-center gap-2"><button onClick={() => avaliar(i.codigo_serial, i.produto_id, true)} className="bg-green-100 text-green-700 px-3 py-1 rounded">Aprovar Reuso</button><button onClick={() => avaliar(i.codigo_serial, i.produto_id, false)} className="bg-red-100 text-red-700 px-3 py-1 rounded">Sucata</button></div>) : '-'}</td></tr>))}</tbody></table></div></div>
    </div>
  );
}

function TelaDashboard({ data }) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-800">Visão Geral</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <CardStat titulo="Hoje" valor={data.kpis?.diario || 0} cor="bg-blue-500" />
        <CardStat titulo="Esta Semana" valor={data.kpis?.semanal || 0} cor="bg-indigo-500" />
        <CardStat titulo="Este Mês" valor={data.kpis?.mensal || 0} cor="bg-purple-500" />
        <CardStat titulo="Este Trimestre" valor={data.kpis?.trimestral || 0} cor="bg-slate-700" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm overflow-hidden"><h3 className="text-lg font-bold mb-4">Instalações (7 dias)</h3><ResponsiveContainer width="100%" height={300}><BarChart data={data.grafico}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="dia" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="instalacoes" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm"><h3 className="text-lg font-bold mb-4">Desempenho da Equipe</h3><div className="overflow-x-auto max-h-[300px]"><table className="w-full text-left whitespace-nowrap"><thead><tr className="bg-gray-50 text-sm"><th className="p-3">Técnico</th><th className="p-3 text-center">Mensal</th><th className="p-3 text-center">Média Diária</th></tr></thead><tbody>{data.tecnicos.map(t => <tr key={t.nome} className="text-sm border-b"><td className="p-3 font-medium">{t.nome}</td><td className="p-3 text-center font-bold">{t.total_mes}</td><td className="p-3 text-center text-blue-600">{t.media_diaria}/dia</td></tr>)}</tbody></table></div></div>
      </div>
    </div>
  );
}

function CardStat({ titulo, valor, cor }) {
  return (<div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"><h4 className="text-gray-500 text-sm font-semibold uppercase">{titulo}</h4><p className={`text-4xl font-bold mt-2 text-transparent bg-clip-text bg-gradient-to-r ${cor} to-black`}>{valor}</p></div>);
}

function TelaCompras({ previsao }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="p-6 border-b bg-gradient-to-r from-blue-50 to-white"><h2 className="text-2xl font-bold flex items-center"><ShoppingCart className="mr-2 text-blue-600"/> Inteligência de Compras</h2></div>
      <div className="overflow-x-auto"><table className="w-full text-left whitespace-nowrap"><thead><tr className="bg-gray-50 text-sm"><th className="p-4 border-b">Equipamento</th><th className="p-4 border-b text-center">Média/Dia</th><th className="p-4 border-b text-center">Ponto de Pedido</th><th className="p-4 border-b text-center">Estoque Atual</th><th className="p-4 border-b text-center">Sugestão</th></tr></thead><tbody>{previsao.map((p) => (<tr key={p.id} className="border-b text-sm"><td className="p-4 font-medium">{p.nome}</td><td className="p-4 text-center">{p.cmd}</td><td className="p-4 text-center font-bold text-orange-600">{p.ponto_pedido}</td><td className={`p-4 text-center font-bold ${p.status === 'URGENTE' ? 'text-red-600' : 'text-green-600'}`}>{p.quantidade_matriz}</td><td className="p-4 text-center"><span className={`py-1 px-3 rounded font-bold text-sm ${p.sugerido > 0 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{p.sugerido > 0 ? `Comprar ${p.sugerido}` : 'OK'}</span></td></tr>))}</tbody></table></div>
    </div>
  );
}

// ==========================================
// TELA DE CONFIGURAÇÕES (Agora configurando a Categoria Inteira)
// ==========================================
function TelaConfiguracao({ produtos, tecnicos, reload }) {
  const [tipo, setTipo] = useState('CATEGORIA');
  const [id, setId] = useState('RASTREADOR');
  const [limite, setLimite] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (tipo === 'CATEGORIA') {
      const prodsDaCategoria = produtos.filter(p => p.categoria === id);
      if (prodsDaCategoria.length === 0) return alert('Cadastre pelo menos 1 modelo desta categoria primeiro.');
      
      // Atualiza o limite de todos os modelos daquela categoria no banco
      for (let p of prodsDaCategoria) {
        await api.put('/configurar-alerta', { tipo: 'PRODUTO', id: p.id, novo_limite: Number(limite) });
      }
    } else {
      await api.put('/configurar-alerta', { tipo: 'TECNICO', id, novo_limite: Number(limite) });
    }
    alert('Regra de Alerta Salva!');
    setLimite('');
    reload();
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm max-w-lg border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 flex items-center"><Settings className="mr-2"/> Configuração de Alertas</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Onde aplicar o alerta?</label>
          <select className="w-full p-4 border rounded-xl" value={tipo} onChange={e => {setTipo(e.target.value); setId(e.target.value === 'CATEGORIA' ? 'RASTREADOR' : '');}}>
            <option value="CATEGORIA">Geral da Matriz (Por Categoria)</option>
            <option value="TECNICO">Estoque do Técnico</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Alvo</label>
          {tipo === 'CATEGORIA' ? (
            <select required className="w-full p-4 border rounded-xl" value={id} onChange={e => setId(e.target.value)}>
              <option value="RASTREADOR">Total de Rastreadores</option>
              <option value="TAG">Total de Tags</option>
            </select>
          ) : (
            <select required className="w-full p-4 border rounded-xl" value={id} onChange={e => setId(e.target.value)}>
              <option value="">Selecione o Técnico...</option>
              {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade Mínima Exigida</label>
          <input required type="number" min="0" placeholder="Ex: 50" className="w-full p-4 border rounded-xl" value={limite} onChange={e => setLimite(e.target.value)} />
        </div>
        <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl">Salvar Nova Regra</button>
      </form>
    </div>
  );
}

function TelaTecnicos({ tecnicos, estoque, reload }) {
  const [nome, setNome] = useState('');
  const submit = async (e) => { e.preventDefault(); await api.post('/tecnicos', { nome }); alert('Cadastrado!'); setNome(''); reload(); };
  const remover = async (id, nomeTec) => { if (estoque.some(et => et.tecnico_id === id && et.quantidade > 0)) return alert(`Técnico possui itens.`); if (window.confirm(`Remover ${nomeTec}?`)) { await api.delete(`/tecnicos/${id}`); reload(); } };
  return (<div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 h-fit"><h2 className="text-2xl font-bold mb-6 flex items-center"><UserPlus className="mr-2"/> Novo Técnico</h2><form onSubmit={submit} className="space-y-4"><input required placeholder="Nome do Instalador" className="w-full p-4 border rounded-xl" value={nome} onChange={e => setNome(e.target.value)}/><button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl">Salvar</button></form></div><div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100"><h2 className="text-xl font-bold mb-6">Equipe</h2><ul className="divide-y">{tecnicos.map(t => (<li key={t.id} className="py-4 font-medium flex justify-between">{t.nome}<button onClick={() => remover(t.id, t.nome)} className="text-red-400 hover:text-red-600"><Trash2 size={20} /></button></li>))}</ul></div></div>);
}

function TelaLogs({ logs }) {
  return (<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="p-6 border-b"><h2 className="text-2xl font-bold flex items-center"><ClipboardList className="mr-2"/> Histórico</h2></div><div className="overflow-x-auto"><table className="w-full text-left whitespace-nowrap"><thead><tr className="bg-gray-50 text-sm"><th className="p-4">Data</th><th className="p-4">Ação</th><th className="p-4">Equipamento</th><th className="p-4">Técnico</th><th className="p-4 text-center">Quantidade</th></tr></thead><tbody>{logs.map((log) => (<tr key={log.id} className="border-b text-sm"><td className="p-4">{new Date(log.data).toLocaleString('pt-BR')}</td><td className="p-4 font-bold">{log.tipo}</td><td className="p-4">{log.produto}</td><td className="p-4">{log.tecnico || '-'}</td><td className="p-4 text-center font-bold">{log.quantidade}</td></tr>))}</tbody></table></div></div>);
}
