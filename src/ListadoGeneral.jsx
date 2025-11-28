import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, MousePointer2, MessageCircle } from 'lucide-react'; 
import { DetalleCliente } from './DetalleCliente';

export function ListadoGeneral({ usuario }) {
  if (!usuario) return null;

  const [creditos, setCreditos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [creditoSeleccionado, setCreditoSeleccionado] = useState(null);
  
  // Estado para los inputs de cobro rápido
  const [abonos, setAbonos] = useState({});
  const [procesandoId, setProcesandoId] = useState(null);

  useEffect(() => {
    cargarData();
  }, [usuario]);

  async function cargarData() {
    const { data } = await supabase
      .from('creditos')
      .select(`*, clientes ( nombre_completo, telefono_celular ), pagos ( id, monto )`)
      .eq('empresa_id', usuario.empresa_id)
      .eq('estado', 'ACTIVO')
      .order('id', { ascending: false });

    if (data) {
      const dataProcesada = data.map(c => {
        const totalPagado = c.pagos.reduce((sum, p) => sum + p.monto, 0);
        const cuotasCanceladas = Math.floor(totalPagado / c.valor_cuota);
        const cuotasPendientes = c.modalidad_dias - cuotasCanceladas;
        
        return {
          ...c,
          cc: cuotasCanceladas,
          cp: cuotasPendientes > 0 ? cuotasPendientes : 0,
          totalPagadoReal: totalPagado
        };
      });
      setCreditos(dataProcesada);
    }
  }

  // --- LÓGICA DE COBRO RÁPIDO + WHATSAPP ---
  async function aplicarAbonoRapido(credito) {
    const montoTexto = abonos[credito.id];
    // Si no escriben nada, asumimos la cuota normal sugerida
    const monto = montoTexto ? parseFloat(montoTexto) : credito.valor_cuota;

    if (!monto || monto <= 0) return alert("Ingresa un monto válido.");
    
    // Confirmación rápida
    if (!window.confirm(`¿Cobrar S/ ${monto} a ${credito.clientes.nombre_completo}?`)) return;

    setProcesandoId(credito.id);

    try {
      // 1. Guardar Pago
      const { error: errPago } = await supabase.from('pagos').insert([{
        credito_id: credito.id,
        monto: monto,
        metodo_pago: 'EFECTIVO',
        usuario_cobrador_id: usuario.id,
        empresa_id: usuario.empresa_id
      }]);
      if (errPago) throw errPago;

      // 2. Actualizar Saldo
      const nuevoSaldo = credito.saldo_restante - monto;
      const nuevoEstado = nuevoSaldo <= 0 ? 'FINALIZADO' : 'ACTIVO';

      const { error: errCredito } = await supabase
        .from('creditos')
        .update({ 
          saldo_restante: nuevoSaldo, 
          fecha_ultimo_pago: new Date(),
          estado: nuevoEstado
        })
        .eq('id', credito.id)
        .eq('empresa_id', usuario.empresa_id);

      if (errCredito) throw errCredito;

      // 3. ÉXITO Y WHATSAPP
      // Limpiamos el input visualmente
      const nuevosAbonos = { ...abonos };
      delete nuevosAbonos[credito.id];
      setAbonos(nuevosAbonos);
      
      // Recargamos datos para ver colores nuevos
      await cargarData();

      // PREGUNTA AUTOMÁTICA DE WHATSAPP
      const deseaWhatsapp = window.confirm("✅ Pago registrado.\n\n¿Deseas enviar el recibo por WhatsApp al cliente?");
      
      if (deseaWhatsapp) {
        let telefono = credito.clientes.telefono_celular?.replace(/\D/g, '') || '';
        if (telefono.length === 9) telefono = '51' + telefono;
        
        if (telefono.length < 9) {
          alert("El cliente no tiene un número celular válido registrado.");
        } else {
          const mensaje = `Hola *${credito.clientes.nombre_completo}*! 👋 Pago recibido: *S/ ${monto}*. 📉 Saldo: *S/ ${nuevoSaldo}*.`;
          const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
          window.open(url, '_blank');
        }
      }

    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setProcesandoId(null);
    }
  }

  const handleInputChange = (id, valor) => {
    setAbonos(prev => ({ ...prev, [id]: valor }));
  };

  if (creditoSeleccionado) {
    return <DetalleCliente creditoId={creditoSeleccionado} alVolver={() => setCreditoSeleccionado(null)} />;
  }

  const filtrados = creditos.filter(c => 
    c.clientes.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto', padding: '10px' }}>
      
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#000080', margin: '5px 0' }}>LISTADO GENERAL DE COBRANZA</h2>
        <div style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '18px' }}>
          {creditos.length} CRÉDITOS ACTIVOS
        </div>
        
        <div style={{ margin: '15px auto', maxWidth: '400px', display: 'flex', border: '2px solid #000080', padding: '2px' }}>
          <input 
            type="text" placeholder="BUSCAR CLIENTE..." 
            style={{ flex: 1, border: 'none', padding: '8px', outline: 'none', textTransform: 'uppercase' }}
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
          />
          <button style={{ backgroundColor: '#000080', color: 'white', border: 'none', padding: '0 15px' }}><Search size={16} /></button>
        </div>
      </div>

      {/* TABLA UNIFICADA */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial Narrow, sans-serif', fontSize: '13px', border: '2px solid #000080', minWidth: '600px' }}>
        <thead>
          <tr style={{ backgroundColor: 'blue', color: 'yellow', textAlign: 'center' }}>
            <th style={thStyle}>CPen</th>
            <th style={thStyle}>CCan</th>
            <th style={thStyle}>Saldo</th>
            <th style={{...thStyle, width: '30%'}}>Cliente</th>
            <th style={{...thStyle, width: '15%', backgroundColor:'#b91c1c', color:'white'}}>COBRAR</th> {/* Columna Destacada */}
            <th style={thStyle}>Cuota</th>
            <th style={thStyle}>Estado</th>
            <th style={thStyle}>Ver</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map((item, index) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #000080', backgroundColor: index % 2 === 0 ? 'white' : '#f0f8ff' }}>
              
              <td style={{...tdStyle, backgroundColor: '#800080', color: 'white', fontWeight: 'bold'}}>{item.cp}</td>
              <td style={{...tdStyle, backgroundColor: '#008000', color: 'white', fontWeight: 'bold'}}>{item.cc}</td>
              <td style={{...tdStyle, backgroundColor: '#FFFF00', color: 'black', fontWeight: 'bold'}}>$ {item.saldo_restante}</td>
              <td style={{...tdStyle, color: '#000080', fontWeight: 'bold', textAlign: 'left', paddingLeft: '10px'}}>{item.clientes.nombre_completo}</td>

              {/* --- ZONA DE COBRO --- */}
              <td style={{...tdStyle, backgroundColor: '#ffe4e1', borderLeft: '2px solid red', borderRight: '2px solid red'}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'3px'}}>
                  <input 
                    type="number" 
                    value={abonos[item.id] !== undefined ? abonos[item.id] : ''}
                    onChange={(e) => handleInputChange(item.id, e.target.value)}
                    placeholder={item.valor_cuota} // Muestra la cuota como sugerencia
                    style={{
                      width: '50px', padding: '5px', border: '1px solid #000080', 
                      backgroundColor: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize:'12px'
                    }}
                  />
                  <button 
                    onClick={() => aplicarAbonoRapido(item)}
                    disabled={procesandoId === item.id}
                    style={{
                      backgroundColor: '#dc2626', color: 'white', border: 'none',
                      borderRadius: '4px', padding: '5px 8px', cursor: 'pointer', fontWeight: 'bold',
                      fontSize: '10px'
                    }}
                  >
                    {procesandoId === item.id ? '...' : 'OK'}
                  </button>
                </div>
              </td>
              {/* --------------------- */}

              <td style={{...tdStyle, backgroundColor: '#0000FF', color: 'white'}}>$ {item.valor_cuota}</td>
              <td style={{...tdStyle, color: '#008000', fontStyle: 'italic'}}>** GRABADO **</td>
              <td style={tdStyle}>
                <button onClick={() => setCreditoSeleccionado(item.id)} style={{ background: 'linear-gradient(to bottom, #ffcccc 0%, #ff0000 100%)', border: '1px solid #800000', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', color: 'black', fontWeight: 'bold', fontSize: '10px' }}>
                  DETALLES
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = { padding: '5px', border: '1px solid white' };
const tdStyle = { padding: '5px', textAlign: 'center', borderRight: '1px solid #ccc' };