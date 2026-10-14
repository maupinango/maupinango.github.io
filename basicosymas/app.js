// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const SUPABASE_URL = 'https://dweecggxuwbuqzbgqomg.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_KL2YZnb2PKD53Mw9GJ0wcA_IaW8dCy6'; 

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. ELEMENTOS DEL DOM
// ==========================================
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const bcvRateEl = document.getElementById('bcv-rate');
const productList = document.getElementById('product-list');
const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const modalTitle = document.getElementById('modal-title');
const btnAddProduct = document.getElementById('btn-add-product');

// ==========================================
// 3. AUTENTICACIÓN
// ==========================================
async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        showApp();
    } else {
        showLogin();
    }
}

function showApp() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    appScreen.classList.add('active');
    
    loginForm.reset();
    loginError.textContent = '';
    
    cargarTasaBCV();
    cargarProductos();
    cargarProductosCache();
    cargarHistorialVentas();
}

function showLogin() {
    // Ocultar TODAS las pantallas primero
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    // Luego mostrar solo el login
    loginScreen.classList.add('active');
    
    // Limpiar campos del formulario y cualquier mensaje de error previo
    loginForm.reset();
    loginError.textContent = '';
    
    // Limpiar el carrito y variables globales por seguridad
    carrito = [];
    if (typeof renderCarrito === 'function') renderCarrito();
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    loginError.textContent = '';

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        loginError.textContent = 'Error: ' + error.message;
    } else {
        showApp();
    }
});

logoutBtn.addEventListener('click', async () => {
    await _supabase.auth.signOut();
    showLogin();
});

// ==========================================
// 4. TASA BCV (GESTIÓN MANUAL)
// ==========================================
async function cargarTasaBCV() {
    try {
        const { data, error } = await _supabase
            .from('configuracion')
            .select('valor, actualizado_en')
            .eq('clave', 'tasa_bcv')
            .single();

        if (error) {
            console.error('Error al cargar tasa:', error);
            bcvRateEl.textContent = 'Tasa no configurada';
            return;
        }

        const valor = parseFloat(data.valor) || 0;
        tasaActual = valor;

        if (valor > 0) {
            const fecha = new Date(data.actualizado_en);
            const fechaStr = fecha.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            bcvRateEl.textContent = `1 USD = ${valor.toFixed(2)} Bs (${fechaStr})`;
        } else {
            bcvRateEl.textContent = '⚠️ Configura la tasa del día';
        }

        // Actualizar totales del carrito si aplica
        if (carrito.length > 0) actualizarTotales();

    } catch (error) {
        console.error('Error tasa:', error);
        bcvRateEl.textContent = 'Error al cargar tasa';
    }
}

// Guardar nueva tasa en Supabase
async function guardarTasaBCV(nuevaTasa) {
    const { error } = await _supabase
        .from('configuracion')
        .update({ valor: nuevaTasa.toString(), actualizado_en: new Date().toISOString() })
        .eq('clave', 'tasa_bcv');

    if (error) {
        alert('Error al guardar la tasa: ' + error.message);
        return false;
    }
    return true;
}

// --- Modal de edición de tasa ---
const rateModal = document.getElementById('rate-modal');
const rateForm = document.getElementById('rate-form');
const rateInput = document.getElementById('rate-input');

document.getElementById('btn-edit-rate').addEventListener('click', () => {
    rateInput.value = tasaActual > 0 ? tasaActual.toFixed(2) : '';
    rateModal.classList.add('active');
    setTimeout(() => rateInput.focus(), 100);
});

document.querySelector('.close-rate-modal').addEventListener('click', () => {
    rateModal.classList.remove('active');
});

rateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevaTasa = parseFloat(rateInput.value);

    if (!nuevaTasa || nuevaTasa <= 0) {
        alert('Ingresa un monto válido mayor a 0');
        return;
    }

    const guardado = await guardarTasaBCV(nuevaTasa);
    if (guardado) {
        tasaActual = nuevaTasa;
        rateModal.classList.remove('active');
        await cargarTasaBCV();
        alert(`Tasa actualizada a ${nuevaTasa.toFixed(2)} Bs/USD`);
    }
});

// ==========================================
// 5. CRUD DE PRODUCTOS
// ==========================================
async function cargarProductos() {
    productList.innerHTML = '<p>Cargando productos...</p>';
    
    // 1. Cargar productos
    const { data: productos, error: prodError } = await _supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });

    if (prodError) {
        console.error('Error al cargar productos:', prodError);
        productList.innerHTML = '<p>Error al cargar productos.</p>';
        return;
    }

    // 2. Cargar todas las ventas realizadas para calcular cantidades vendidas
    const { data: detalles, error: detError } = await _supabase
        .from('detalles_ventas')
        .select('producto_id, cantidad');

    if (detError) {
        console.error('Error al cargar detalles:', detError);
    }

    // 3. Crear un mapa de { producto_id: cantidad_total_vendida }
    const ventasPorProducto = {};
    if (detalles) {
        detalles.forEach(d => {
            if (!ventasPorProducto[d.producto_id]) {
                ventasPorProducto[d.producto_id] = 0;
            }
            ventasPorProducto[d.producto_id] += d.cantidad;
        });
    }

    // 4. Agregar el campo "vendidos" a cada producto
    productosConVentasCache = productos.map(p => ({
        ...p,
        vendidos: ventasPorProducto[p.id] || 0
    }));

    // 5. Aplicar orden y renderizar
    aplicarOrdenYRenderizar();
}

// --- Aplicar el orden seleccionado y renderizar ---
function aplicarOrdenYRenderizar() {
    const productos = [...productosConVentasCache]; // Copia para no modificar el original

    switch (ordenActual) {
        case 'nombre-asc':
            productos.sort((a, b) => a.nombre.localeCompare(b.nombre));
            break;
        case 'vendidos-desc':
            productos.sort((a, b) => b.vendidos - a.vendidos);
            break;
        case 'vendidos-asc':
            productos.sort((a, b) => a.vendidos - b.vendidos);
            break;
        default:
            productos.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    renderProductos(productos);
}

// --- Escuchar cambios en el selector de orden ---
const sortSelect = document.getElementById('sort-products');
if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
        ordenActual = e.target.value;
        aplicarOrdenYRenderizar();
    });
}

function renderProductos(productos) {
    if (productos.length === 0) {
        productList.innerHTML = '<p>No hay productos registrados.</p>';
        return;
    }

    // SVG placeholder por si el producto no tiene imagen
    const imagenDefault = "data:image/svg+xml;utf8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#e9ecef"/>
            <text x="50" y="58" font-size="40" text-anchor="middle" fill="#adb5bd">📦</text>
        </svg>
    `);

    productList.innerHTML = productos.map(prod => {
        // Usamos la imagen del producto o la default si no tiene
        const imagenSrc = prod.imagen_url && prod.imagen_url.trim() !== ''
            ? prod.imagen_url
            : imagenDefault;

        return `
            <div class="product-card">
                <img 
                    src="${imagenSrc}" 
                    alt="${prod.nombre}" 
                    class="product-thumb"
                    onerror="this.src='${imagenDefault}'"
                >
                <div class="product-info">
                    <h4>${prod.nombre} <span class="vendidos-badge" title="Unidades vendidas">${prod.vendidos} vendidos</span></h4>
                    <p>Costo: $${prod.costo} | Venta: $${prod.precio_venta}</p>
                    <p>Lugar: ${prod.lugar_compra || 'N/A'}</p>
                </div>
                <div class="product-stock">
                    <span class="stock-num ${prod.stock_actual <= 2 ? 'low' : ''}">${prod.stock_actual}</span>
                    <div class="product-actions">
                        <button class="btn-icon-small" onclick="editarProducto(${prod.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon-small delete" onclick="eliminarProducto(${prod.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Abrir Modal para Nuevo Producto
btnAddProduct.addEventListener('click', () => {
    productForm.reset();
    document.getElementById('product-id').value = '';
    modalTitle.textContent = 'Nuevo Producto';
    productModal.classList.add('active');
});

// Cerrar Modal
document.querySelector('.close-modal').addEventListener('click', () => {
    productModal.classList.remove('active');
});

// Guardar (Crear o Editar)
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    
    const productoData = {
        nombre: document.getElementById('prod-nombre').value,
        costo: parseFloat(document.getElementById('prod-costo').value),
        lugar_compra: document.getElementById('prod-lugar').value,
        precio_venta: parseFloat(document.getElementById('prod-precio').value),
        porcentaje_ganancia: parseFloat(document.getElementById('prod-ganancia').value),
        stock_actual: parseInt(document.getElementById('prod-stock').value),
        precios_competencia: document.getElementById('prod-competencia').value
    };

    let error;
    if (id) {
        // Actualizar
        const { error: err } = await _supabase.from('productos').update(productoData).eq('id', id);
        error = err;
    } else {
        // Crear
        const { error: err } = await _supabase.from('productos').insert([productoData]);
        error = err;
    }

    if (error) {
        alert('Error al guardar: ' + error.message);
    } else {
        productModal.classList.remove('active');
        cargarProductos();
    }
});

// Función global para Editar
window.editarProducto = async (id) => {
    const { data, error } = await _supabase.from('productos').select('*').eq('id', id).single();
    if (error) return alert('Error al obtener producto');

    document.getElementById('product-id').value = data.id;
    document.getElementById('prod-nombre').value = data.nombre;
    document.getElementById('prod-costo').value = data.costo;
    document.getElementById('prod-lugar').value = data.lugar_compra;
    document.getElementById('prod-precio').value = data.precio_venta;
    document.getElementById('prod-ganancia').value = data.porcentaje_ganancia;
    document.getElementById('prod-stock').value = data.stock_actual;
    document.getElementById('prod-competencia').value = data.precios_competencia;

    modalTitle.textContent = 'Editar Producto';
    productModal.classList.add('active');
};

// Función global para Eliminar
window.eliminarProducto = async (id) => {
    // 1. Verificar si el producto tiene ventas asociadas
    const { data: ventasAsociadas, error: checkError } = await _supabase
        .from('detalles_ventas')
        .select('id')
        .eq('producto_id', id)
        .limit(1);

    if (checkError) {
        alert('Error al verificar ventas asociadas: ' + checkError.message);
        return;
    }

    if (ventasAsociadas && ventasAsociadas.length > 0) {
        alert(
            '⚠️ No se puede eliminar este producto.\n\n' +
            'Existen ventas registradas que lo incluyen. ' +
            'Si deseas ocultarlo, considera dejarlo con stock en 0 en lugar de eliminarlo.\n\n' +
            'Esto protege el historial de ventas y los reportes.'
        );
        return;
    }

    // 2. Confirmación del usuario
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    // 3. Eliminar
    const { error } = await _supabase.from('productos').delete().eq('id', id);
    if (error) {
        alert('Error al eliminar: ' + error.message);
    } else {
        await cargarProductos();
        await cargarProductosCache();
    }
};

// ==========================================
// 6. NAVEGACIÓN POR PESTAÑAS
// ==========================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Quitar active de todos
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Activar el seleccionado
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

// ==========================================
// 8. MÓDULO DE VENTAS
// ==========================================

// Variables globales del carrito
let carrito = [];
let tasaActual = 0;
let productosCache = []; // Para búsquedas rápidas
let productosConVentasCache = []; // Guarda la última lista con ventas calculadas
let ordenActual = 'nombre-asc'; // Orden actual de la lista

// --- Cargar productos en caché al iniciar ---
async function cargarProductosCache() {
    const { data } = await _supabase.from('productos').select('*').order('nombre');
    productosCache = data || [];
}

// --- Buscador de Productos ---
const searchInput = document.getElementById('search-product');
const searchResults = document.getElementById('search-results');

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (term.length < 2) {
        searchResults.classList.remove('active');
        return;
    }

    const filtrados = productosCache.filter(p => 
        p.nombre.toLowerCase().includes(term) && p.stock_actual > 0
    );

    if (filtrados.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No se encontraron productos con stock</div>';
    } else {
        searchResults.innerHTML = filtrados.map(p => `
            <div class="search-result-item" onclick="agregarAlCarrito(${p.id})">
                <span>${p.nombre}</span>
                <span>$${p.precio_venta} | Stock: ${p.stock_actual}</span>
            </div>
        `).join('');
    }
    searchResults.classList.add('active');
});

// Ocultar resultados al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.remove('active');
    }
});

// --- Lógica del Carrito ---
window.agregarAlCarrito = (productoId) => {
    const producto = productosCache.find(p => p.id === productoId);
    if (!producto) return;

    const itemExistente = carrito.find(item => item.id === productoId);
    
    if (itemExistente) {
        if (itemExistente.cantidad < producto.stock_actual) {
            itemExistente.cantidad++;
        } else {
            alert('No hay suficiente stock disponible');
        }
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio_venta: parseFloat(producto.precio_venta),
            costo: parseFloat(producto.costo),
            cantidad: 1,
            stock_max: producto.stock_actual
        });
    }

    searchInput.value = '';
    searchResults.classList.remove('active');
    renderCarrito();
};

window.cambiarCantidad = (productoId, delta) => {
    const item = carrito.find(i => i.id === productoId);
    if (!item) return;

    const nuevaCantidad = item.cantidad + delta;
    if (nuevaCantidad <= 0) {
        carrito = carrito.filter(i => i.id !== productoId);
    } else if (nuevaCantidad <= item.stock_max) {
        item.cantidad = nuevaCantidad;
    } else {
        alert('No hay suficiente stock');
    }
    renderCarrito();
};

window.eliminarDelCarrito = (productoId) => {
    carrito = carrito.filter(i => i.id !== productoId);
    renderCarrito();
};

function renderCarrito() {
    const cartContainer = document.getElementById('cart-items');
    
    if (carrito.length === 0) {
        cartContainer.innerHTML = '<p class="empty-cart">El carrito está vacío</p>';
        document.getElementById('btn-checkout').disabled = true;
    } else {
        cartContainer.innerHTML = carrito.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h5>${item.nombre}</h5>
                    <span>$${item.precio_venta.toFixed(2)} c/u</span>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="cambiarCantidad(${item.id}, -1)">-</button>
                    <span>${item.cantidad}</span>
                    <button class="qty-btn" onclick="cambiarCantidad(${item.id}, 1)">+</button>
                    <span class="cart-item-subtotal">$${(item.precio_venta * item.cantidad).toFixed(2)}</span>
                    <button class="btn-icon-small delete" onclick="eliminarDelCarrito(${item.id})"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `).join('');
        document.getElementById('btn-checkout').disabled = false;
    }

    actualizarTotales();
}

function actualizarTotales() {
    const totalUSD = carrito.reduce((sum, item) => sum + (item.precio_venta * item.cantidad), 0);
    const totalBs = totalUSD * tasaActual;

    document.getElementById('total-usd').textContent = `$${totalUSD.toFixed(2)}`;
    document.getElementById('rate-used').textContent = `${tasaActual.toFixed(2)})`;
    document.getElementById('total-bs').textContent = `Bs. ${totalBs.toFixed(2)}`;
}

// --- Checkout ---
const checkoutModal = document.getElementById('checkout-modal');
const checkoutForm = document.getElementById('checkout-form');

document.getElementById('btn-checkout').addEventListener('click', () => {
    // Total a pagar
    const totalUSD = carrito.reduce((sum, item) => sum + (item.precio_venta * item.cantidad), 0);
    const totalBs = totalUSD * tasaActual;

    // Costo total (dinero invertido que se recupera)
    const costoTotal = carrito.reduce((sum, item) => sum + (item.costo * item.cantidad), 0);
    const costoTotalBs = costoTotal * tasaActual;

    // Ganancia neta (utilidad real)
    const gananciaNeta = totalUSD - costoTotal;
    const gananciaNetaBs = gananciaNeta * tasaActual;
    
    document.getElementById('checkout-total-usd').textContent = `$${totalUSD.toFixed(2)}`;
    document.getElementById('checkout-total-bs').textContent = `Bs. ${totalBs.toFixed(2)}`;
    document.getElementById('checkout-cost').textContent = `$${costoTotal.toFixed(2)}`;
    document.getElementById('checkout-cost-bs').textContent = `(Bs. ${costoTotalBs.toFixed(2)})`;
    document.getElementById('checkout-profit').textContent = `$${gananciaNeta.toFixed(2)}`;
    document.getElementById('checkout-profit-bs').textContent = `(Bs. ${gananciaNetaBs.toFixed(2)})`;
    
    checkoutModal.classList.add('active');
});

document.querySelector('.close-checkout-modal').addEventListener('click', () => {
    checkoutModal.classList.remove('active');
});

checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const apto = document.getElementById('checkout-apto').value.trim();
    const totalUSD = carrito.reduce((sum, item) => sum + (item.precio_venta * item.cantidad), 0);
    const totalBs = totalUSD * tasaActual;

    // 1. Insertar la venta principal
    const { data: ventaData, error: ventaError } = await _supabase
        .from('ventas')
        .insert([{
            total_usd: totalUSD,
            total_bs: totalBs,
            tasa_bcv: tasaActual,
            apartamento_vecino: apto || null
        }])
        .select()
        .single();

    if (ventaError) {
        alert('Error al guardar la venta: ' + ventaError.message);
        return;
    }

    const ventaId = ventaData.id;

    // 2. Insertar los detalles de la venta
    const detalles = carrito.map(item => ({
        venta_id: ventaId,
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_venta,
        subtotal: item.precio_venta * item.cantidad
    }));

    const { error: detallesError } = await _supabase.from('detalles_ventas').insert(detalles);

    if (detallesError) {
        alert('Error al guardar detalles: ' + detallesError.message);
        return;
    }

    // 3. Descontar stock de cada producto
    for (const item of carrito) {
        const producto = productosCache.find(p => p.id === item.id);
        const nuevoStock = producto.stock_actual - item.cantidad;
        
        await _supabase
            .from('productos')
            .update({ stock_actual: nuevoStock })
            .eq('id', item.id);
    }

    // 4. Limpiar y actualizar
    alert('¡Venta registrada con éxito!');
    carrito = [];
    renderCarrito();
    checkoutModal.classList.remove('active');
    checkoutForm.reset();
    
    // Recargar datos
    await cargarProductos();
    await cargarProductosCache();
    await cargarHistorialVentas();
});

// --- Historial de Ventas ---
async function cargarHistorialVentas(desde = null, hasta = null) {
    let query = _supabase
        .from('ventas')
        .select('*')
        .order('fecha', { ascending: false });

    if (desde) query = query.gte('fecha', desde);
    if (hasta) query = query.lte('fecha', hasta + 'T23:59:59');

    const { data, error } = await query;

    if (error) {
        console.error('Error historial:', error);
        return;
    }

    renderHistorial(data);
    calcularTotalesPeriodo(data);
}

function renderHistorial(ventas) {
    const container = document.getElementById('sales-history');
    if (ventas.length === 0) {
        container.innerHTML = '<p>No hay ventas en este período.</p>';
        return;
    }

    container.innerHTML = ventas.map(v => `
        <div class="sale-record">
            <div><strong>${new Date(v.fecha).toLocaleString()}</strong></div>
            <div>Total: $${parseFloat(v.total_usd).toFixed(2)} | Bs. ${parseFloat(v.total_bs).toFixed(2)}</div>
            <div>Tasa: ${parseFloat(v.tasa_bcv).toFixed(2)}</div>
            ${v.apartamento_vecino ? `<div><i class="fas fa-door-open"></i> Apto: ${v.apartamento_vecino}</div>` : ''}
        </div>
    `).join('');
}

function calcularTotalesPeriodo(ventas) {
    // Para calcular la ganancia, necesitamos los detalles de cada venta
    // Por simplicidad, haremos una consulta agregada
    // NOTA: Esto es una aproximación. Lo ideal sería traer los detalles.
    
    const totalUSD = ventas.reduce((sum, v) => sum + parseFloat(v.total_usd), 0);
    
    // Para ganancia, necesitamos consultar detalles_ventas
    // Haremos una consulta aparte
    calcularGananciaPeriodo(ventas.map(v => v.id), totalUSD);
}

async function calcularGananciaPeriodo(ventaIds, totalUSD) {
    if (ventaIds.length === 0) {
        document.getElementById('sum-total-usd').textContent = '$0.00';
        document.getElementById('sum-profit').textContent = '$0.00';
        document.getElementById('sum-cost').textContent = '$0.00';
        return;
    }

    // Obtener detalles de las ventas
    const { data: detalles } = await _supabase
        .from('detalles_ventas')
        .select('subtotal, cantidad, producto_id')
        .in('venta_id', ventaIds);

    if (!detalles) return;

    // Obtener costos de los productos
    const productoIds = [...new Set(detalles.map(d => d.producto_id))];
    const { data: productos } = await _supabase
        .from('productos')
        .select('id, costo')
        .in('id', productoIds);

    const costosMap = {};
    productos.forEach(p => costosMap[p.id] = parseFloat(p.costo));

    // Calcular
    const costoTotal = detalles.reduce((sum, d) => {
        const costoUnit = costosMap[d.producto_id] || 0;
        return sum + (costoUnit * d.cantidad);
    }, 0);

    const gananciaNeta = totalUSD - costoTotal;

    document.getElementById('sum-total-usd').textContent = `$${totalUSD.toFixed(2)}`;
    document.getElementById('sum-profit').textContent = `$${gananciaNeta.toFixed(2)}`;
    document.getElementById('sum-cost').textContent = `$${costoTotal.toFixed(2)}`;
}

// Filtros de fecha
document.getElementById('btn-filter').addEventListener('click', () => {
    const desde = document.getElementById('filter-from').value;
    const hasta = document.getElementById('filter-to').value;
    cargarHistorialVentas(desde || null, hasta || null);
});

// Modificar la función showApp para cargar los datos de ventas también
const originalShowApp = showApp;
showApp = function() {
    originalShowApp();
    cargarProductosCache();
    cargarHistorialVentas();
};

// ==========================================
// 7. INICIALIZACIÓN
// ==========================================
checkSession();