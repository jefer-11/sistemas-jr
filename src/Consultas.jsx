import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { Search, FileText, CheckCircle, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export function Consultas() {
  const { usuario } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [cliente, setCliente] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [score, setScore] = useState('NEUTRO');

  // --- BUSCAR CLIENTE ---
  const buscarCliente = async (e) => {
    e.preventDefault();
    if(!busqueda.trim()) return;
    setLoading(true);
    setCliente(null);
    setHistorial([]);

    try {
      // Buscar por DNI o Nombre
      const { data: clientes } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', usuario.empresa_id)
        .or(`dni.eq.${busqueda},nombre_completo.ilike.%${busqueda}%`)
        .limit(1);

      if (clientes && clientes.length > 0) {
        const found = clientes[0];
        setCliente(found);
        
        // Traer historial completo
        const { data: creditos } = await supabase
          .from('creditos')
          .select('*, pagos(*)')
          .eq('cliente_id', found.id)
          .order('created_at', { ascending: false });
        
        setHistorial(creditos || []);
        calcularScore(creditos || []);
      } else {
        alert("❌ Cliente no encontrado en la base de datos.");
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // --- CALCULAR RIESGO ---
  const calcularScore = (creditos) => {
    if (creditos.length === 0) return setScore('NEUTRO');
    let malos = 0;
    creditos.forEach(c => {
        const finEstimado = new Date(c.fecha_fin_estimada);
        const ultimoPago = c.fecha_ultimo_pago ? new Date(c.fecha_ultimo_pago) : new Date();
        // Si pagó tarde o está activo y vencido
        if (ultimoPago > finEstimado || (c.estado === 'ACTIVO' && new Date() > finEstimado)) malos++;
    });
    if (malos === 0) setScore('VERDE'); 
    else if (malos <= 2) setScore('AMARILLO'); 
    else setScore('ROJO');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '10px' }}>
      <div style={{textAlign:'center', marginBottom:'20px'}}>
        <h2 style={{color:'#111827', display:'flex', justifyContent:'center', alignItems:'center', gap:'10px'}}>
            <ShieldCheck color="#2563eb" /> Consulta de Riesgo
        </h2>
        <p style={{color:'#6b7280', fontSize:'14px'}}>Valida el historial antes de prestar</p>
      </div>

      <form onSubmit={buscarCliente} style={{ display: 'flex', gap: '10px', marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #d1d5db' }}>
        <input 
            placeholder="Ingresa DNI o Nombre..." 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
            style={{flex:1, border:'none', outline:'none', fontSize:'16px', fontWeight:'bold'}}
            autoFocus
        />
        <button type="submit" disabled={loading} style={{background:'none', border:'none', cursor:'pointer', color:'#2563eb'}}>
            <Search size={24}/>
        </button>
      </form>

      {cliente && (
        <div style={{animation: 'fadeIn 0.3s'}}>
            {/* TARJETA RESUMEN */}
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', borderLeft: `8px solid ${score === 'VERDE' ? '#16a34a' : score === 'AMARILLO' ? '#eab308' : '#dc2626'}`, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom:'20px' }}>
                <h2 style={{margin:0, color:'#111827'}}>{cliente.nombre_completo}</h2>
                <div style={{color:'#6b7280', marginBottom:'10px'}}>DNI: {cliente.dni}</div>
                
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <span style={{fontSize:'14px', fontWeight:'bold', color:'#374151'}}>Calificación:</span>
                    {score === 'VERDE' && <span style={{backgroundColor:'#dcfce7', color:'#16a34a', padding:'4px 10px', borderRadius:'6px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px'}}><CheckCircle size={16}/> EXCELENTE</span>}
                    {score === 'AMARILLO' && <span style={{backgroundColor:'#fef3c7', color:'#d97706', padding:'4px 10px', borderRadius:'6px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px'}}><AlertTriangle size={16}/> REGULAR</span>}
                    {score === 'ROJO' && <span style={{backgroundColor:'#fee2e2', color:'#dc2626', padding:'4px 10px', borderRadius:'6px', fontWeight:'bold', display:'flex', alignItems:'center', gap:'5px'}}><XCircle size={16}/> RIESGO ALTO</span>}
                    {score === 'NEUTRO' && <span style={{backgroundColor:'#f3f4f6', color:'#6b7280', padding:'4px 10px', borderRadius:'6px', fontWeight:'bold'}}>SIN HISTORIAL</span>}
                </div>
            </div>

            {/* TABLA HISTORIAL */}
            <h3 style={{color:'#374151'}}>📜 Historial de Créditos ({historial.length})</h3>
            <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse', backgroundColor:'white', fontSize:'13px'}}>
                    <thead>
                        <tr style={{background:'#f9fafb', color:'#4b5563', textAlign:'left'}}>
                            <th style={{padding:'10px'}}>Fecha</th>
                            <th style={{padding:'10px'}}>Monto</th>
                            <th style={{padding:'10px'}}>Estado</th>
                            <th style={{padding:'10px'}}>Pagos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historial.map(c => {
                            const pagado = c.pagos?.reduce((sum, p) => sum + p.monto, 0) || 0;
                            return (
                                <tr key={c.id} style={{borderBottom:'1px solid #eee'}}>
                                    <td style={{padding:'10px'}}>{new Date(c.created_at).toLocaleDateString()}</td>
                                    <td style={{padding:'10px', fontWeight:'bold'}}>S/ {c.total_a_pagar}</td>
                                    <td style={{padding:'10px'}}>
                                        <span style={{
                                            padding:'2px 6px', borderRadius:'4px', fontWeight:'bold', fontSize:'11px',
                                            backgroundColor: c.estado === 'ACTIVO' ? '#dbeafe' : '#dcfce7',
                                            color: c.estado === 'ACTIVO' ? '#1e40af' : '#166534'
                                        }}>
                                            {c.estado}
                                        </span>
                                    </td>
                                    <td style={{padding:'10px'}}>
                                        Pagado: <strong>S/ {pagado}</strong>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
}