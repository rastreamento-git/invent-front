import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { LayoutDashboard, PackagePlus, Truck, Settings, AlertTriangle, Wrench, ClipboardList, ShoppingCart, UserPlus, Undo2, Trash2, ImagePlus, Camera, Plus, X, Search, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

const api = axios.create({ baseURL: 'https://estoque-api-7l82.onrender.com/api' });
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [produtos, setProdutos] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [estoqueTecnicos, setEstoqueTecnicos] = useState([]);
  const [logs, setLogs] = useState([]);
  const [previsao, setPrevisao] = useState([]);
  const [dashboard, setDashboard] = useState({ kpis: {}, grafico: [], tecnicos: [] });
  
  const notificadoRef = useRef(new Set()); // Evita repetição de notificações

  const fetchData = async () => {
    const [prodRes, techRes, dashRes, estTechRes, logsRes, prevRes] = await Promise.all([
      api.get('/produtos'), api.get('/tecnicos'), api.get('/dashboard'),
      api.get('/estoque-tecnicos'), api.get('/logs'), api.get('/previsao-compras')
    ]);
    setProdutos(prodRes.data); setTecnicos(techRes.data); setDashboard(dashRes.data);
    setEstoqueTecnicos(estTechRes.data); setLogs(logsRes.data); setPrevisao(prevRes.data);
  };

  // Solicita permissão para notificações do navegador
  useEffect(() => {
    if (Notification.permission === "default") Notification.requestPermission();
    fetchData();
  }, []);

  // Dispara notificações nativas se o estoque estiver baixo
  useEffect(() => {
    if (Notification.permission === "granted") {
      produtos.forEach(p => {
        const key = `matriz-${p.id}-${p.quantidade_matriz}`;
        if (p.quantidade_matriz <= p.estoque_minimo && !notificadoRef.current.has(key)) {
          new Notification("Alerta de Estoque: Matriz", { body: `${p.nome} está com saldo baixo (${p.quantidade_matriz}).` });
          notificadoRef.current.add(key);
        }
      });
      estoqueTecnicos.forEach(et => {
        const key = `tec-${et.tecnico_id}-${et.produto_id}-${et.quantidade}`;
        if (et.quantidade <= et.estoque_minimo && !notificadoRef.current.has(key)) {
          new Notification("Alerta de Estoque: Técnico", { body: `O técnico ${et.tecnico_nome} está com poucas unidades de ${et.produto_nome} (${et.quantidade}).` });
          notificadoRef.current.add(key);
        }
      });
    }
  }, [produtos, estoqueTecnicos]);

  // Easter Egg: Listener de teclado para "resetzenseguros"
  useEffect(() => {
    let buffer = '';
    const secretCode = 'resetzenseguros';

    const handleKeyDown = (e) => {
      if (e.key.length === 1) {
        buffer += e.key.toLowerCase();
        if (buffer.length > secretCode.length) buffer = buffer.slice(-secretCode.length);
        
        if (buffer === secretCode) {
          buffer = ''; 
          if (window.confirm('⚠️️ EASTER EGG ATIVADO: Deseja zerar todo o estoque e apagar o histórico de movimentações?')) {
            api.post('/reset').then(() => {
              alert('Sistema resetado com sucesso! Os números e IMEIs estão zerados.');
              window.location.reload(); 
            }).catch(() => alert('Erro ao resetar o sistema.'));
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const alertasMatriz = produtos.filter(p => p.quantidade_matriz <= p.estoque_minimo);
  const alertasTecnicos = estoqueTecnicos.filter(et => et.quantidade <= et.estoque_minimo);

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* MENU LATERAL */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-slate-800">Estoque <span className="text-blue-500">Pro</span></div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <MenuButton icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <MenuButton icon={<PackagePlus />} label="Entrada Matriz" active={activeTab === 'entrada'} onClick={() => setActiveTab('entrada')} />
          <MenuButton icon={<Truck />} label="Carga p/ Técnico" active={activeTab === 'transferencia'} onClick={() => setActiveTab('transferencia')} />
          <MenuButton icon={<Wrench />} label="Baixa (Instalação)" active={activeTab === 'instalacao'} onClick={() => setActiveTab('instalacao')} />
          <MenuButton icon={<Undo2 />} label="Correções (Estornos)" active={activeTab === 'estorno'} onClick={() => setActiveTab('estorno')} />
          <MenuButton icon={<Search />} label="Controle IMEI & Triagem" active={activeTab === 'rastreio'} onClick={() => setActiveTab('rastreio')} />
          <MenuButton icon={<ShoppingCart />} label="Previsão de Compras" active={activeTab === 'compras'} onClick={() => setActiveTab('compras')} />
          <MenuButton icon={<UserPlus />} label="Equipe (Técnicos)" active={activeTab === 'tecnicos'} onClick={() => setActiveTab('tecnicos')} />
          <MenuButton icon={<ClipboardList />} label="Histórico (Logs)" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <MenuButton icon={<Settings />} label="Configurações" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
        </nav>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 p-8 overflow-y-auto">
        {(alertasMatriz.length > 0 || alertasTecnicos.length > 0) && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
            <div className="flex items-center text-red-800 font-bold mb-2"><AlertTriangle className="mr-2" /> Atenção: Níveis Críticos de Estoque</div>
            <ul className="ml-8 text-red-700 list-disc text-sm space-y-1">
              {alertasMatriz.map(a => <li key={`m-${a.id}`}><strong>Matriz:</strong> {a.nome} (Restam {a.quantidade_matriz})</li>)}
              {alertasTecnicos.map(a => <li key={`t-${a.tecnico_id}-${a.produto_id}`}><strong>{a.tecnico_nome}:</strong> {a.produto_nome} (Restam {a.quantidade})</li>)}
            </ul>
          </div>
        )}

        {/* ROTEAMENTO DE TELAS */}
        {activeTab === 'dashboard' && <TelaDashboard data={dashboard} />}
        {activeTab === 'entrada' && <TelaEntrada produtos={produtos} reload={fetchData} />}
        {activeTab === 'transferencia' && <TelaTransferencia produtos={produtos} tecnicos={tecnicos} reload={fetchData} />}
        {activeTab === 'instalacao' && <TelaInstalacao produtos={produtos} tecnicos={tecnicos} estoque={estoqueTecnicos} reload={fetchData} />}
        {activeTab === 'estorno' && <TelaEstorno produtos={produtos} tecnicos={tecnicos} estoque={estoqueTecnicos} reload={fetchData} />}
        {activeTab === 'rastreio' && <TelaRastreioTriagem reload={fetchData} />}
        {activeTab === 'compras' && <TelaCompras previsao={previsao} />}
        {activeTab === 'tecnicos' && <TelaTecnicos tecnicos={tecnicos} estoque={estoqueTecnicos} reload={fetchData} />}
        {activeTab === 'logs' && <TelaLogs logs={logs} />}
        {activeTab === 'config' && <TelaConfiguracao produtos={produtos} tecnicos={tecnicos} reload={fetchData} />}
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

// ==========================================
// COMPONENTE DE UX REUTILIZÁVEL: LEITOR DE IMEI/QR
// ==========================================
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
    audio.play().catch(() => {}); // Bipe de confirmação
    
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

    if (falhas > 0) alert(`${falhas} foto(s) não possuía(m) um código de barras legível.`);
  };

  return (
    <div className="pt-4 border-t flex flex-col gap-3">
      <div id="file-reader-hidden" style={{ display: 'none' }}></div>

      {!cameraAtiva ? (
        <button type="button" onClick={() => setCameraAtiva(true)} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-md flex justify-center items-center transition">
          <Camera className="mr-2" /> Câmera ao Vivo
        </button>
      ) : (
        <div className="mb-4">
          <button type="button" onClick={() => setCameraAtiva(false)} className="mb-2 text-red-500 text-sm font-bold flex items-center">
            <X size={16} className="mr-1"/> Fechar Câmera
          </button>
          <div id="reader-camera" className="w-full overflow-hidden rounded-md border-2 border-dashed border-blue-400"></div>
        </div>
      )}

      <label className={`w-full ${processandoFoto ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'} text-white font-bold py-4 rounded-md flex justify-center items-center transition shadow-sm`}>
        {processandoFoto ? 'Analisando Imagem(ns)...' : <><ImagePlus className="mr-2" /> Upload de Fotos (Lote)</>}
        <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadFotos} disabled={processandoFoto} />
      </label>

      <div className="pt-2 flex gap-2">
        <input type="text" placeholder="Ou digite o IMEI/QR Code..." className="flex-1 p-3 border border-gray-300 rounded-md bg-gray-50 focus:bg-white" value={inputManual} onChange={e => setInputManual(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionarSerial(inputManual))} />
        <button type="button" onClick={() => adicionarSerial(inputManual)} className="bg-slate-200 text-slate-700 p-3 rounded-md hover:bg-slate-300"><Plus/></button>
      </div>
    </div>
  );
}

// Subcomponente de Conferência (Lado Direito das Telas)
function SidebarConferencia({ seriais, setSeriais, submit, disabled, labelBtn, corBtn }) {
  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col h-fit">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Itens Prontos ({seriais.length})</h3>
      <p className="text-sm text-gray-500 mb-4">Confira os números antes de concluir a operação.</p>
      
      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-md border border-slate-200 mb-6 max-h-[350px] min-h-[200px]">
        {seriais.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 italic">Nenhum equipamento lido.</div>
        ) : (
          <ul className="space-y-2">
            {seriais.map((codigo, index) => (
              <li key={codigo} className="bg-white p-3 rounded shadow-sm border border-slate-100 flex justify-between items-center font-mono text-sm">
                <span><span className="text-blue-500 font-bold mr-2">#{seriais.length - index}</span> {codigo}</span>
                <button type="button" onClick={() => setSeriais(seriais.filter(s => s !== codigo))} className="text-red-400 hover:text-red-600 p-1"><X size={18}/></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={submit} disabled={disabled} className={`w-full font-bold py-4 rounded-md text-white transition-all shadow-md ${disabled ? 'bg-gray-300 cursor-not-allowed shadow-none' : `${corBtn} hover:shadow-lg`}`}>
        {labelBtn} de {seriais.length} item(ns)
      </button>
    </div>
  );
}

// ==========================================
// TELAS DE OPERAÇÃO
// ==========================================

function TelaEntrada({ produtos, reload }) {
  const [produtoId, setProdutoId] = useState('');
  const [seriais, setSeriais] = useState([]);

  const submit = async (e) => {
    e.preventDefault();
    if (seriais.length === 0) return alert('Leia ou digite pelo menos 1 IMEI/QR Code.');
    try {
      await api.post('/entrada', { produto_id: produtoId, seriais });
      alert(`${seriais.length} equipamentos registrados com sucesso!`);
      setSeriais([]); setProdutoId(''); reload();
    } catch (error) { alert(error.response?.data?.error || 'Erro ao registrar.'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><PackagePlus className="mr-2"/> Receber Lote (Matriz)</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Equipamento correspondente:</label>
            <select className="mt-1 block w-full p-3 border border-gray-300 rounded-md" value={produtoId} onChange={e => setProdutoId(e.target.value)}>
              <option value="">Selecione...</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <LeitorSeriais seriais={seriais} setSeriais={setSeriais} />
        </div>
      </div>
      <SidebarConferencia seriais={seriais} setSeriais={setSeriais} submit={submit} disabled={!produtoId || seriais.length === 0} labelBtn="Confirmar Entrada" corBtn="bg-emerald-600 hover:bg-emerald-700" />
    </div>
  );
}

function TelaTransferencia({ produtos, tecnicos, reload }) {
  const [tecnicoId, setTecnicoId] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [seriais, setSeriais] = useState([]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/transferir', { tecnico_id: tecnicoId, produto_id: produtoId, seriais });
      alert(`Transferência de ${res.data.transferidos} itens concluída!`);
      setSeriais([]); reload();
    } catch (error) { alert(error.response?.data?.error || 'Erro na transferência.'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Truck className="mr-2"/> Transferir para Técnico</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Técnico Destino:</label>
              <select className="mt-1 block w-full p-3 border border-gray-300 rounded-md" value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}>
                <option value="">Selecione...</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Equipamento:</label>
              <select className="mt-1 block w-full p-3 border border-gray-300 rounded-md" value={produtoId} onChange={e => setProdutoId(e.target.value)}>
                <option value="">Selecione...</option>
                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>
          <LeitorSeriais seriais={seriais} setSeriais={setSeriais} />
        </div>
      </div>
      <SidebarConferencia seriais={seriais} setSeriais={setSeriais} submit={submit} disabled={!produtoId || !tecnicoId || seriais.length === 0} labelBtn="Executar Transferência" corBtn="bg-blue-600 hover:bg-blue-700" />
    </div>
  );
}

function TelaInstalacao({ produtos, tecnicos, estoque, reload }) {
  const [tecnicoId, setTecnicoId] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [seriais, setSeriais] = useState([]);
  
  const prodDoTecnico = estoque.filter(et => et.tecnico_id === Number(tecnicoId) && et.quantidade > 0);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/instalar', { tecnico_id: tecnicoId, produto_id: produtoId, seriais });
      alert(`Instalação de ${res.data.instalados} equipamento(s) registrada!`);
      setSeriais([]); reload();
    } catch (error) { alert(error.response?.data?.error || 'Erro na instalação.'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Wrench className="mr-2"/> Registrar Instalação</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Técnico Responsável:</label>
              <select className="mt-1 block w-full p-3 border border-gray-300 rounded-md" value={tecnicoId} onChange={e => {setTecnicoId(e.target.value); setProdutoId('');}}>
                <option value="">Selecione...</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Equipamento:</label>
              <select className="mt-1 block w-full p-3 border border-gray-300 rounded-md" value={produtoId} onChange={e => setProdutoId(e.target.value)} disabled={!tecnicoId}>
                <option value="">{tecnicoId ? 'Selecione...' : 'Selecione o técnico'}</option>
                {prodDoTecnico.map(et => <option key={et.produto_id} value={et.produto_id}>{et.produto_nome} (Na Posse: {et.quantidade})</option>)}
              </select>
            </div>
          </div>
          <LeitorSeriais seriais={seriais} setSeriais={setSeriais} />
        </div>
      </div>
      <SidebarConferencia seriais={seriais} setSeriais={setSeriais} submit={submit} disabled={!produtoId || !tecnicoId || seriais.length === 0} labelBtn="Confirmar Instalação" corBtn="bg-emerald-600 hover:bg-emerald-700" />
    </div>
  );
}

function TelaEstorno({ produtos, tecnicos, estoque, reload }) {
  const [tipo, setTipo] = useState('MATRIZ');
  const [produtoId, setProdutoId] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [seriais, setSeriais] = useState([]);

  const submit = async (e) => {
    e.preventDefault();
    if (confirm(`Tem certeza que deseja estornar/devolver ${seriais.length} equipamento(s)?`)) {
      try {
        const res = await api.post('/estorno', { tipo_estorno: tipo, produto_id: produtoId, tecnico_id: tecnicoId, seriais });
        alert(`${res.data.estornados} equipamento(s) estornado(s) com sucesso.`);
        setSeriais([]); reload();
      } catch (error) { alert(error.response?.data?.error || 'Erro no estorno.'); }
    }
  };

  const estoqueFiltrado = tipo === 'TECNICO' ? estoque.filter(e => e.tecnico_id === Number(tecnicoId)) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center text-red-600"><Undo2 className="mr-2"/> Correção / Devolução</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ação de Correção:</label>
            <select className="mt-1 block w-full p-3 border border-gray-300 rounded-md" value={tipo} onChange={e => {setTipo(e.target.value); setProdutoId(''); setTecnicoId('');}}>
              <option value="MATRIZ">Remover da Matriz (Erro de Entrada)</option>
              <option value="TECNICO">Devolução do Técnico p/ Matriz</option>
            </select>
          </div>

          {tipo === 'TECNICO' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Qual Técnico está devolvendo?</label>
              <select className="mt-1 block w-full p-3 border border-gray-300 rounded-md" value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}>
                <option value="">Selecione...</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Equipamento:</label>
            <select className="mt-1 block w-full p-3 border border-gray-300 rounded-md" value={produtoId} onChange={e => setProdutoId(e.target.value)} disabled={tipo === 'TECNICO' && !tecnicoId}>
              <option value="">Selecione...</option>
              {tipo === 'MATRIZ' 
                ? produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)
                : estoqueFiltrado.map(et => <option key={et.produto_id} value={et.produto_id}>{et.produto_nome} (Na Posse: {et.quantidade})</option>)
              }
            </select>
          </div>
          
          {/* Adicionamos o leitor na tela de Estorno também! */}
          <LeitorSeriais seriais={seriais} setSeriais={setSeriais} />
        </div>
      </div>
      <SidebarConferencia seriais={seriais} setSeriais={setSeriais} submit={submit} disabled={!produtoId || (tipo === 'TECNICO' && !tecnicoId) || seriais.length === 0} labelBtn="Executar Devolução/Estorno" corBtn="bg-red-600 hover:bg-red-700" />
    </div>
  );
}

// ==== NOVA TELA: RASTREIO E TRIAGEM (RMA) ====
function TelaRastreioTriagem({ reload }) {
  const [imeis, setImeis] = useState([]);
  const [seriaisRecebidos, setSeriaisRecebidos] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('TODOS');

  const carregarImeis = async () => {
    const res = await api.get('/imeis');
    setImeis(res.data);
  };

  useEffect(() => { carregarImeis(); }, []);

  const enviarParaTriagem = async (e) => {
    e.preventDefault();
    try {
      await api.post('/triagem/receber', { seriais: seriaisRecebidos });
      alert(`${seriaisRecebidos.length} equipamento(s) enviado(s) para Triagem!`);
      setSeriaisRecebidos([]); carregarImeis(); reload();
    } catch(err) { alert('Erro ao mandar para triagem.'); }
  };

  const avaliar = async (codigo_serial, produto_id, aprovado) => {
    const acao = aprovado ? "APROVAR (Voltar para a Matriz)" : "REPROVAR (Descartar/Sucata)";
    if (window.confirm(`Deseja ${acao} o IMEI ${codigo_serial}?`)) {
      await api.post('/triagem/avaliar', { codigo_serial, produto_id, aprovado });
      carregarImeis(); reload();
    }
  };

  const limparAntigos = async () => {
    if (window.confirm("Deseja remover do sistema todos os equipamentos INSTALADOS há mais de 30 dias?")) {
      const res = await api.delete('/limpeza-instalados');
      alert(`${res.data.apagados} IMEI(s) antigo(s) apagado(s).`);
      carregarImeis();
    }
  };

  const formatarData = (dataStr) => new Date(dataStr).toLocaleString('pt-BR');
  const imeisFiltrados = filtroStatus === 'TODOS' ? imeis : imeis.filter(i => i.status === filtroStatus);
  const totalTriagem = imeis.filter(i => i.status === 'TRIAGEM').length;

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center"><ShieldCheck className="mr-2 text-orange-500"/> Devolução e Triagem</h2>
          <p className="text-sm text-gray-500 mb-6">Receba equipamentos defeituosos ou retirados de clientes para análise.</p>
          <LeitorSeriais seriais={seriaisRecebidos} setSeriais={setSeriaisRecebidos} />
        </div>
        <SidebarConferencia seriais={seriaisRecebidos} setSeriais={setSeriaisRecebidos} submit={enviarParaTriagem} disabled={seriaisRecebidos.length === 0} labelBtn="Mandar para Triagem" corBtn="bg-orange-500 hover:bg-orange-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-slate-50 flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center"><Search className="mr-2"/> Rastreabilidade de IMEIs</h2>
          <div className="flex items-center gap-4">
            <button onClick={limparAntigos} className="text-sm text-slate-600 bg-white border border-slate-300 px-4 py-2 rounded-md hover:bg-slate-100">
              Limpar Instalados (+30 dias)
            </button>
            <select className="p-2 border border-gray-300 rounded-md font-bold text-sm" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="TODOS">Ver Todos</option>
              <option value="MATRIZ">Matriz</option>
              <option value="TECNICO">Com Técnico</option>
              <option value="INSTALADO">Instalados</option>
              <option value="TRIAGEM">Na Triagem ({totalTriagem})</option>
              <option value="SUCATA">Sucata (Descartados)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-gray-100">
              <tr className="text-gray-600 text-sm">
                <th className="p-4 border-b">IMEI / QR</th>
                <th className="p-4 border-b">Equipamento</th>
                <th className="p-4 border-b">Localização</th>
                <th className="p-4 border-b">Última Atualização</th>
                <th className="p-4 border-b text-center">Ações (Triagem)</th>
              </tr>
            </thead>
            <tbody>
              {imeisFiltrados.map((i) => (
                <tr key={i.codigo_serial} className="hover:bg-gray-50 border-b border-gray-50 text-sm">
                  <td className="p-4 font-mono font-bold text-blue-600">{i.codigo_serial}</td>
                  <td className="p-4 font-medium text-gray-800">{i.produto}</td>
                  <td className="p-4">
                    {i.status === 'MATRIZ' && <span className="bg-blue-100 text-blue-800 py-1 px-2 rounded font-bold text-xs">Matriz</span>}
                    {i.status === 'TECNICO' && <span className="bg-indigo-100 text-indigo-800 py-1 px-2 rounded font-bold text-xs">Téc: {i.tecnico}</span>}
                    {i.status === 'INSTALADO' && <span className="bg-emerald-100 text-emerald-800 py-1 px-2 rounded font-bold text-xs">Instalado</span>}
                    {i.status === 'TRIAGEM' && <span className="bg-orange-100 text-orange-800 py-1 px-2 rounded font-bold text-xs animate-pulse">Triagem</span>}
                    {i.status === 'SUCATA' && <span className="bg-red-100 text-red-800 py-1 px-2 rounded font-bold text-xs">Sucata</span>}
                  </td>
                  <td className="p-4 text-gray-500">{formatarData(i.data_atualizacao)}</td>
                  <td className="p-4 text-center">
                    {i.status === 'TRIAGEM' ? (
                      <div className="flex justify-center gap-2">
                        <button onClick={() => avaliar(i.codigo_serial, i.produto_id, true)} className="bg-green-100 text-green-700 hover:bg-green-600 hover:text-white px-3 py-1 rounded transition">Aprovar Reuso</button>
                        <button onClick={() => avaliar(i.codigo_serial, i.produto_id, false)} className="bg-red-100 text-red-700 hover:bg-red-600 hover:text-white px-3 py-1 rounded transition">Sucata</button>
                      </div>
                    ) : ( <span className="text-gray-300">-</span> )}
                  </td>
                </tr>
              ))}
              {imeisFiltrados.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-gray-400 italic">Nenhum equipamento listado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// OUTROS COMPONENTES E TELAS MANUAIS
// ==========================================

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
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-4 text-gray-700">Instalações (Últimos 7 dias)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.grafico}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="dia" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="instalacoes" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Instalações" /></BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-4 text-gray-700">Desempenho da Equipe (30 dias)</h3>
          <div className="overflow-auto max-h-[300px]">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50 text-sm text-gray-500"><th className="p-3">Técnico</th><th className="p-3 text-center">Total Mensal</th><th className="p-3 text-center">Média Diária</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.tecnicos.map(t => <tr key={t.nome} className="text-sm text-gray-700"><td className="p-3 font-medium">{t.nome}</td><td className="p-3 text-center font-bold">{t.total_mes}</td><td className="p-3 text-center text-blue-600">{t.media_diaria}/dia</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardStat({ titulo, valor, cor }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h4 className="text-gray-500 text-sm font-semibold uppercase">{titulo}</h4>
      <p className={`text-4xl font-bold mt-2 text-transparent bg-clip-text bg-gradient-to-r ${cor} to-black`}>{valor}</p>
    </div>
  );
}

function TelaCompras({ previsao }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white"><h2 className="text-2xl font-bold text-gray-800 flex items-center"><ShoppingCart className="mr-2 text-blue-600"/> Inteligência de Compras</h2><p className="text-sm text-gray-500 mt-2">Cálculo baseado em: Lead Time de 15 dias e Cobertura Alvo de 45 dias.</p></div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr className="bg-gray-50 text-gray-600 text-sm"><th className="p-4 border-b">Equipamento</th><th className="p-4 border-b text-center">Média Diária</th><th className="p-4 border-b text-center">Ponto de Pedido</th><th className="p-4 border-b text-center">Matriz Atual</th><th className="p-4 border-b text-center">Sugestão</th></tr></thead>
          <tbody>{previsao.map((p) => (<tr key={p.id} className="hover:bg-gray-50 border-b border-gray-50"><td className="p-4 font-medium text-gray-800">{p.nome}</td><td className="p-4 text-center text-gray-600">{p.cmd} und/dia</td><td className="p-4 text-center font-bold text-orange-600">{p.ponto_pedido}</td><td className={`p-4 text-center font-bold ${p.status === 'URGENTE' ? 'text-red-600' : 'text-green-600'}`}>{p.quantidade_matriz}</td><td className="p-4 text-center"><span className={`py-1 px-3 rounded font-bold text-sm ${p.sugerido > 0 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{p.sugerido > 0 ? `Comprar ${p.sugerido}` : 'Estoque Adequado'}</span></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

function TelaConfiguracao({ produtos, tecnicos, reload }) {
  const [tipo, setTipo] = useState('PRODUTO'), [id, setId] = useState(''), [limite, setLimite] = useState('');
  const submit = async (e) => { e.preventDefault(); await api.put('/configurar-alerta', { tipo, id, novo_limite: Number(limite) }); alert('Limiar atualizado!'); setLimite(''); setId(''); reload(); };
  return (
    <div className="bg-white p-8 rounded-xl shadow-sm max-w-lg border border-gray-100"><h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Settings className="mr-2"/> Alertas de Estoque</h2>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700">Configurar limite para:</label><select className="mt-1 block w-full p-3 border border-gray-300 rounded-md" value={tipo} onChange={e => {setTipo(e.target.value); setId('');}}><option value="PRODUTO">Geral da Matriz (Produtos)</option><option value="TECNICO">Estoque do Técnico</option></select></div>
        <div><label className="block text-sm font-medium text-gray-700">Selecione</label><select required className="mt-1 block w-full p-3 border border-gray-300 rounded-md" value={id} onChange={e => setId(e.target.value)}><option value="">Selecione...</option>{tipo === 'PRODUTO' ? produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (Atual: {p.estoque_minimo})</option>) : tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome} (Atual: {t.estoque_minimo})</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700">Avisar quando chegar em</label><input required type="number" min="0" className="mt-1 block w-full p-3 border border-gray-300 rounded-md" value={limite} onChange={e => setLimite(e.target.value)} /></div>
        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md">Salvar Regra</button>
      </form>
    </div>
  );
}

function TelaTecnicos({ tecnicos, estoque, reload }) {
  const [nome, setNome] = useState('');
  const submit = async (e) => { e.preventDefault(); await api.post('/tecnicos', { nome }); alert('Técnico cadastrado!'); setNome(''); reload(); };
  
  const removerTecnico = async (id, nomeTecnico) => {
    if (estoque.some(et => et.tecnico_id === id && et.quantidade > 0)) return alert(`⚠️ AÇÃO BLOQUEADA: ${nomeTecnico} ainda possui equipamentos. Efetue estorno ou instalação antes.`);
    if (window.confirm(`Tem certeza que deseja remover ${nomeTecnico}? O histórico será preservado.`)) { 
      try { await api.delete(`/tecnicos/${id}`); alert('Removido com sucesso!'); reload(); } catch (e) { alert('Erro ao remover.'); } 
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 h-fit"><h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><UserPlus className="mr-2"/> Novo Técnico</h2><form onSubmit={submit} className="space-y-4"><div><label className="block text-sm font-medium text-gray-700">Nome</label><input required className="mt-1 block w-full p-3 border border-gray-300 rounded-md" value={nome} onChange={e => setNome(e.target.value)}/></div><button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md">Salvar</button></form></div>
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100"><h2 className="text-xl font-bold text-gray-800 mb-6">Equipe Cadastrada</h2><ul className="divide-y divide-gray-100">{tecnicos.map(t => (<li key={t.id} className="py-4 font-medium flex items-center justify-between"><div className="flex items-center"><div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mr-3">{t.nome.charAt(0)}</div>{t.nome}</div><button onClick={() => removerTecnico(t.id, t.nome)} className="text-red-400 hover:text-red-600"><Trash2 size={20} /></button></li>))}</ul></div>
    </div>
  );
}

function TelaLogs({ logs }) {
  const formatarData = (dataStr) => new Date(dataStr).toLocaleString('pt-BR');
  const traduzirTipo = (tipo) => {
    if (tipo === 'ENTRADA_MATRIZ') return <span className="bg-blue-100 text-blue-800 py-1 px-2 rounded text-xs font-bold">Entrada</span>;
    if (tipo === 'CARGA_TECNICO') return <span className="bg-slate-100 text-slate-800 py-1 px-2 rounded text-xs font-bold">Transferência</span>;
    if (tipo === 'USO_FINAL') return <span className="bg-emerald-100 text-emerald-800 py-1 px-2 rounded text-xs font-bold">Instalação</span>;
    if (tipo.includes('ESTORNO')) return <span className="bg-red-100 text-red-800 py-1 px-2 rounded text-xs font-bold">Estorno</span>;
    if (tipo === 'REUSO_APROVADO') return <span className="bg-green-100 text-green-800 py-1 px-2 rounded text-xs font-bold">Reuso (Voltou)</span>;
    if (tipo === 'DEVOLUCAO_TECNICO') return <span className="bg-purple-100 text-purple-800 py-1 px-2 rounded text-xs font-bold">Devolução</span>;
    return tipo;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100"><h2 className="text-2xl font-bold text-gray-800 flex items-center"><ClipboardList className="mr-2"/> Histórico de Volume</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr className="bg-gray-50 text-gray-600 text-sm"><th className="p-4">Data</th><th className="p-4">Ação</th><th className="p-4">Equipamento</th><th className="p-4">Técnico</th><th className="p-4 text-center">Quantidade</th></tr></thead>
          <tbody>{logs.map((log) => (<tr key={log.id} className="hover:bg-gray-50 border-b border-gray-50 text-sm"><td className="p-4 text-gray-500">{formatarData(log.data)}</td><td className="p-4">{traduzirTipo(log.tipo)}</td><td className="p-4 font-medium">{log.produto}</td><td className="p-4 text-gray-600">{log.tecnico || '-'}</td><td className="p-4 text-center font-bold">{log.quantidade}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}