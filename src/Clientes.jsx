import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, Plus, MapPin, Camera, Edit, FileText, DollarSign, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from './AuthContext';

export function Clientes({ usuario, vistaInicial = 'lista', alTerminar }) {
  const { irACrearCredito } = useAuth();
  const [vista, setVista] = useState(vistaInicial); 
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [filaExpandida, setFilaExpandida] = useState(null);
  const [historialExpandido, setHistorialExpandido] = useState(null);
  
  // Formulario
  const [modoEdicion, setModoEdicion] = useState(false);
  const [clienteIdEditar, setClienteIdEditar] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('inactivo');
  const [nuevoCliente, setNuevoCliente] = useState({ dni: '', nombre_completo: '', telefono_celular: '', direccion_texto: '', barrio: '', referencia_negocio: '', gps_latitud: null, gps_longitud: null });

  useEffect(() => { if(usuario) fetchClientes(); }, [usuario]);

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('*, creditos(id, estado, saldo_restante)').eq('empresa_id', usuario.empresa_id).order('nombre_completo', { ascending: true });
    if (data) {
        const procesados = data.map(c => {
            const creditoActivo = c.creditos.find(cr => cr.estado === 'ACTIVO');
            return { ...c, creditoActivo };
        });
        setClientes(procesados);
    }
  }

  // ... (Funciones de GPS, Guardar, etc. se mantienen igual, solo cambia el renderizado de botones abajo) ...
  // [AQUÍ PEGAMOS LAS MISMAS FUNCIONES DE GPS Y GUARDAR QUE TE DI EN EL PASO ANTERIOR, RESUMIDO POR ESPACIO]
  // Asegúrate de copiar las funciones obtenerUbicacion, guardarCliente, etc. del código anterior si no las tienes.
  
  // --- ESTILOS VISUALES ---
  const tableHeader = { backgroundColor: 'blue', color: 'yellow', padding: '10px', textAlign: 'left', border: '1px solid white', fontSize:'12px', textTransform:'uppercase' };
  const tableCell = { padding: '8px', borderBottom: '1px solid #ccc', borderRight: '1px solid #ccc', color:'#000080', fontSize:'13px', verticalAlign:'middle' };
  const colMorada = { backgroundColor: '#800080', color: 'white', fontWeight:'bold' };
  const colVerde = { backgroundColor: '#008000', color: 'white', fontWeight:'bold' };
  const colAmarilla = { backgroundColor: '#FFFF00', color: 'black', fontWeight:'bold' };

  // BOTONES CON TEXTO (TU PEDIDO)
  const btnTexto = { 
      border:'1px solid #9ca3af', borderRadius:'4px', cursor:'pointer', fontWeight:'bold', fontSize:'10px', 
      display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', padding:'6px', textDecoration:'none', width:'100%',
      backgroundColor: '#f3f4f6', color: '#374151'
  };

  const filtrados = clientes.filter(c => c.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) || c.dni.includes(busqueda));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {vista === 'lista' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
            <div style={{flex:1, display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '8px', borderRadius: '6px', border: '2px solid #000080' }}>
                <Search color="#000080" />
                <input type="text" placeholder="BUSCAR CLIENTE..." style={{ border: 'none', outline: 'none', width: '100%', marginLeft:'5px', fontWeight:'bold', color:'#000080' }} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <button onClick={() => { setVista('formulario'); }} style={{backgroundColor:'#2563eb', color:'white', padding:'10px 15px', border:'none', borderRadius:'6px', fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px'}}><Plus size={18}/> Nuevo</button>
          </div>

          <div style={{ overflowX: 'auto', border: '2px solid #000080' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily:'Arial, sans-serif' }}>
              <thead>
                <tr>
                  <th style={tableHeader}>Saldo</th>
                  <th style={{...tableHeader, width:'40%'}}>Cliente</th>
                  <th style={tableHeader}>Dirección</th>
                  <th style={{...tableHeader, minWidth:'180px'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c, index) => (
                  <tr key={c.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f0f8ff' }}>
                      <td style={{...tableCell, ...colAmarilla, textAlign:'center'}}>$ {c.creditoActivo ? c.creditoActivo.saldo_restante : 0}</td>
                      <td style={{...tableCell, fontWeight:'bold'}}>{c.nombre_completo}<br/><span style={{fontSize:'11px', color:'#666'}}>{c.dni}</span></td>
                      <td style={tableCell}>{c.direccion_texto}<br/><span style={{fontSize:'11px', fontStyle:'italic'}}>{c.barrio}</span></td>
                      
                      {/* BOTONES CON TEXTO */}
                      <td style={{...tableCell, padding:'5px'}}>
                          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px'}}>
                              <button onClick={() => irACrearCredito(c.id)} style={{...btnTexto, backgroundColor:'#d1fae5', color:'#065f46', border:'1px solid #6ee7b7'}}>
                                  <DollarSign size={12}/> PRESTAR
                              </button>
                              {c.gps_latitud ? (
                                  <a href={`https://www.google.com/maps/search/?api=1&query=${c.gps_latitud},${c.gps_longitud}`} target="_blank" rel="noreferrer" style={{...btnTexto, backgroundColor:'#eff6ff', color:'#1e40af', border:'1px solid #93c5fd'}}>
                                      <MapPin size={12}/> MAPA
                                  </a>
                              ) : <button disabled style={{...btnTexto, opacity:0.5}}><MapPin size={12}/> SIN GPS</button>}
                              
                              <button onClick={() => setVista('formulario')} style={{...btnTexto, backgroundColor:'#fff7ed', color:'#9a3412', border:'1px solid #fdba74'}}>
                                  <Edit size={12}/> EDITAR
                              </button>
                              
                              <button style={btnTexto}>
                                  <FileText size={12}/> INFO
                              </button>
                          </div>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {/* ... (Resto del código del formulario que ya tienes) */}
    </div>
  );
}