let totalPrecios = 0;
  let itemsEnListaActual = []; 
  const LOCAL_STORAGE_CURRENT_LIST_KEY = 'currentShoppingList'; // Nueva clave para la lista actual

  // --- Funciones del Modal Personalizado ---
  let resolveModalPromise;

  function showCustomModal(title, message, type = 'alert') {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalOkBtn = document.getElementById('modalOkBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');

    modalTitle.innerText = title;
    modalMessage.innerText = message;

    modalOkBtn.onclick = () => {
      modal.style.display = 'none';
      if (resolveModalPromise) {
        resolveModalPromise(true);
      }
    };

    if (type === 'confirm') {
      modalCancelBtn.style.display = 'inline-block';
      modalCancelBtn.onclick = () => {
        modal.style.display = 'none';
        if (resolveModalPromise) {
          resolveModalPromise(false);
        }
      };
    } else {
      modalCancelBtn.style.display = 'none';
    }

    modal.style.display = 'flex';
    return new Promise(resolve => {
      resolveModalPromise = resolve;
    });
  }

  function getFormattedDateTime(dateString) {
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    let dateObj;
    if (dateString) {
        const parts = dateString.match(/(\w+), (\d{2}) (\w+) (\d{2}) (\d{2}):(\d{2}):(\d{2})/);
        if (parts) {
            const monthMap = {"enero":0, "febrero":1, "marzo":2, "abril":3, "mayo":4, "junio":5, "julio":6, "agosto":7, "septiembre":8, "octubre":9, "noviembre":10, "diciembre":11};
            const monthNum = monthMap[parts[3].toLowerCase()];
            const yearFull = parseInt(parts[4]) < 70 ? 2000 + parseInt(parts[4]) : 1900 + parseInt(parts[4]); 
            const isoDateString = `${yearFull}-${(monthNum + 1).toString().padStart(2, '0')}-${parts[2]}T${parts[5]}:${parts[6]}:${parts[7]}`;
            dateObj = new Date(isoDateString);
        } else {
            dateObj = new Date(dateString); 
        }
    } else {
        dateObj = new Date(); 
    }

    if (isNaN(dateObj.getTime())) {
        dateObj = new Date();
    }

    const dayOfWeek = weekdays[dateObj.getDay()];
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear().toString().slice(-2); 
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const seconds = dateObj.getSeconds().toString().padStart(2, '0');

    return `${dayOfWeek}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
  }

  // Helper para formatear números sin decimales si son enteros, o con 2 si tienen centavos.
  function formatNumberForDisplay(num) {
      if (Number.isInteger(num)) {
          return num.toString();
      } else {
          return num.toFixed(2).replace(/\.?0+$/, ''); // Elimina .00 al final
      }
  }

  // Helper para formatear cantidades (kg/uni)
  function formatQuantityForDisplay(qty) {
      if (Number.isInteger(parseFloat(qty.toFixed(3)))) { // Considera hasta 3 decimales para kilos
          return qty.toFixed(0); // Si es entero, quita decimales
      } else {
          // Mantener hasta 3 decimales para kilos, eliminando ceros finales.
          return qty.toFixed(3).replace(/\.?0+$/, ''); 
      }
  }

  function actualizarTotalPrecios() {
    let nuevoTotal = 0;
    for (const item of itemsEnListaActual) {
      nuevoTotal += item.precioCalculado;
    }
    totalPrecios = nuevoTotal;
    // Formatear el total para que no tenga decimales si es un número entero exacto, o 2 decimales si no.
    document.getElementById('totalPrecios').innerText = `Total a Pagar: $${formatNumberForDisplay(totalPrecios)}`;
    guardarListaActualEnLocalStorage(); // Guardar cada vez que se actualiza el total
  }

  // Nueva función para guardar la lista actual en localStorage
  function guardarListaActualEnLocalStorage() {
    localStorage.setItem(LOCAL_STORAGE_CURRENT_LIST_KEY, JSON.stringify(itemsEnListaActual));
  }

  // Nueva función para cargar la lista actual desde localStorage
  function cargarListaActualDesdeLocalStorage() {
    const storedList = localStorage.getItem(LOCAL_STORAGE_CURRENT_LIST_KEY);
    if (storedList) {
      itemsEnListaActual = JSON.parse(storedList);
      renderizarListaActual();
      actualizarTotalPrecios(); // Actualiza el total al cargar
    }
  }

  async function añadirALista() {
    const productoInput = document.getElementById('productoInput');
    const precioInput = document.getElementById('precioInput');
    const cantidadInput = document.getElementById('cantidadInput');

    const productoNombre = productoInput.value.trim();
    const precioBase = parseFloat(precioInput.value);
    const cantidadValor = cantidadInput.value.trim(); 

    if (precioInput.value.trim() === '') {
        await showCustomModal('Error de Entrada', '¡El campo de Precio no puede estar vacío!');
        precioInput.focus();
        return;
    }
    if (productoNombre === '' || isNaN(precioBase) || precioBase < 0) {
      await showCustomModal('Error de Entrada', 'Por favor; introduce un nombre de producto y un precio numérico válido (mayor o igual a cero).');
      return;
    }

    let precioFinal = 0;
    let textoDetalleCantidad = ''; 
    let unidadMedida = ''; // 'kg' o 'uni'

    if (cantidadValor === '') {
        precioFinal = precioBase;
        unidadMedida = 'uni';
        textoDetalleCantidad = `1 ${unidadMedida}`;
    } else {
        const cantidad = parseFloat(cantidadValor);

        if (isNaN(cantidad) || cantidad <= 0) {
            await showCustomModal('Error de Entrada', 'Si introduces una cantidad; debe ser un número válido mayor que cero.');
            cantidadInput.focus();
            return;
        }

        // Determinar si es unidad o kilo
        // Si la cantidad es un entero sin decimales (o muy cerca de serlo), la tratamos como unidad.
        // Usamos Number.isInteger con toFixed(10) para evitar problemas de coma flotante.
        if (Number.isInteger(parseFloat(cantidad.toFixed(10)))) { 
            precioFinal = precioBase * cantidad;
            unidadMedida = 'uni';
            textoDetalleCantidad = `${formatQuantityForDisplay(cantidad)} ${unidadMedida}`;
        } else {
            precioFinal = precioBase * cantidad; 
            unidadMedida = 'kg';
            textoDetalleCantidad = `${formatQuantityForDisplay(cantidad)} ${unidadMedida}`; 
        }
    }
    
    const uniqueId = 'item-' + Date.now() + Math.floor(Math.random() * 1000); 

    const itemData = {
        id: uniqueId,
        nombre: productoNombre,
        precioBaseRaw: precioBase, 
        cantidadRaw: cantidadValor === '' ? 1 : parseFloat(cantidadValor), 
        precioBaseFormateado: `$${formatNumberForDisplay(precioBase)}`, // Formatear precio base
        detalleCantidad: textoDetalleCantidad,
        precioCalculado: precioFinal,
        timestamp: Date.now() 
    };
    itemsEnListaActual.push(itemData);

    renderizarListaActual();
    actualizarTotalPrecios(); // Esto llama a guardarListaActualEnLocalStorage()

    productoInput.value = '';
    precioInput.value = '';
    cantidadInput.value = '';
    productoInput.focus();
  }

  function renderizarListaActual() {
      const itemsLista = document.getElementById('itemsLista');
      itemsLista.innerHTML = ''; 

      const itemsOrdenados = [...itemsEnListaActual].sort((a, b) => b.timestamp - a.timestamp);

      itemsOrdenados.forEach(itemData => {
          const listItem = document.createElement('li');
          listItem.id = itemData.id;
          listItem.innerHTML = `
              <span>${itemData.nombre} (${itemData.precioBaseFormateado} / ${itemData.detalleCantidad})</span>
              <span class="precio-display">$${formatNumberForDisplay(itemData.precioCalculado)}</span>
              <button class="eliminar-btn" onclick="eliminarProductoActual('${itemData.id}')">X</button>
          `;
          itemsLista.appendChild(listItem);
      });
  }

  async function eliminarProductoActual(itemId) {
    const index = itemsEnListaActual.findIndex(item => item.id === itemId);

    if (index !== -1) {
      const nombreProductoParaConfirmar = itemsEnListaActual[index].nombre; 
      const confirmed = await showCustomModal('Confirmar Eliminación', `¿Estás seguro de que quieres eliminar "${nombreProductoParaConfirmar}" de la lista actual?"`, 'confirm');
      if (confirmed) {
        itemsEnListaActual.splice(index, 1);
        renderizarListaActual(); 
        actualizarTotalPrecios(); // Esto llama a guardarListaActualEnLocalStorage()
      }
    }
  }

  async function confirmBorrarListaActual() {
    const confirmed = await showCustomModal('Confirmar Borrado', '¿Estás seguro de que quieres borrar todos los productos de la lista actual?', 'confirm');
    if (confirmed) {
      itemsEnListaActual.length = 0; 
      renderizarListaActual(); 
      actualizarTotalPrecios(); // Esto llama a guardarListaActualEnLocalStorage()
      document.getElementById('productoInput').focus();
    }
  }

  async function guardarLista() {
    if (itemsEnListaActual.length === 0) {
      await showCustomModal('Lista Vacía', 'La lista actual está vacía. No hay nada que guardar en el historial.');
      return;
    }

    const listasGuardadas = JSON.parse(localStorage.getItem('listasSuper')) || [];
    
    const nuevaListaGuardada = {
      id: 'lista-' + Date.now(),
      fechaHora: getFormattedDateTime(), 
      total: totalPrecios.toFixed(2), // Guardar el total con 2 decimales para consistencia en el historial
      productos: JSON.parse(JSON.stringify(itemsEnListaActual)) 
    };

    listasGuardadas.push(nuevaListaGuardada);
    localStorage.setItem('listasSuper', JSON.stringify(listasGuardadas));

    await showCustomModal('Lista Guardada', '¡La lista ha sido guardada en el historial!');
    confirmBorrarListaActual(); 
  }

  function renderizarHistorial() {
      const historialListasDiv = document.getElementById('historialListas');
      historialListasDiv.innerHTML = '';
      const listasGuardadas = JSON.parse(localStorage.getItem('listasSuper')) || [];

      // Ordenar las listas por fecha de forma descendente (más reciente primero)
      const listasOrdenadas = listasGuardadas.sort((a, b) => {
          // Extraer el timestamp del ID si está disponible
          const timestampA = parseInt(a.id.replace('lista-', '')) || 0;
          const timestampB = parseInt(b.id.replace('lista-', '')) || 0;
          return timestampB - timestampA;
      });

      if (listasOrdenadas.length === 0) {
          historialListasDiv.innerHTML = '<p>No hay listas guardadas en el historial.</p>';
          return;
      }

      listasOrdenadas.forEach((lista, index) => {
          const historialItemDiv = document.createElement('div');
          historialItemDiv.className = 'historial-item';
          historialItemDiv.id = lista.id;

          let productosHtml = '<ul class="productos-historial">';
          lista.productos.forEach(producto => {
              productosHtml += `
                  <li>
                      <span class="nombre-producto-historial">${producto.nombre}:</span>
                      <span class="cantidad-precio-historial">$${formatNumberForDisplay(producto.precioCalculado)} (${producto.detalleCantidad})</span>
                  </li>`;
          });
          productosHtml += '</ul>';

          historialItemDiv.innerHTML = `
              <h4>Lista guardada el ${lista.fechaHora}</h4>
              ${productosHtml}
              <span class="total-historial">Total: $${formatNumberForDisplay(lista.total)}</span>
              <div class="historial-item-actions">
                  <button class="edit-historial-btn" onclick="editarListaHistorial('${lista.id}')">✏️</button>
                  <button class="delete-historial-btn" onclick="confirmBorrarListaHistorial('${lista.id}')">🗑️</button>
              </div>
          `;
          historialListasDiv.appendChild(historialItemDiv);
      });
  }

  async function confirmBorrarListaHistorial(listaId) {
    const confirmed = await showCustomModal('Confirmar Eliminación', '¿Estás seguro de que quieres eliminar esta lista del historial?', 'confirm');
    if (confirmed) {
      eliminarListaHistorial(listaId);
    }
  }

  function eliminarListaHistorial(listaId) {
    let listasGuardadas = JSON.parse(localStorage.getItem('listasSuper')) || [];
    const index = listasGuardadas.findIndex(lista => lista.id === listaId);

    if (index !== -1) {
      listasGuardadas.splice(index, 1);
      localStorage.setItem('listasSuper', JSON.stringify(listasGuardadas));
      renderizarHistorial();
    }
  }

  async function editarListaHistorial(listaId) {
    const listasGuardadas = JSON.parse(localStorage.getItem('listasSuper')) || [];
    const listaAEditar = listasGuardadas.find(lista => lista.id === listaId);
    
    if (listaAEditar) {
        const confirmed = await showCustomModal('Cargar Lista', '¿Quieres cargar esta lista para editarla en la calculadora actual? Se borrará la lista que tienes ahora.', 'confirm');
        if (confirmed) {
            itemsEnListaActual = JSON.parse(JSON.stringify(listaAEditar.productos)); 
            renderizarListaActual();
            actualizarTotalPrecios(); 
            eliminarListaHistorial(listaId); 
            toggleView('main');
        }
    }
  }

  function toggleView(view) {
    const mainContent = document.getElementById('mainContent');
    const historialContainer = document.getElementById('historialContainer');
    const buscarContainer = document.getElementById('buscarContainer');

    mainContent.style.display = 'none';
    historialContainer.style.display = 'none';
    buscarContainer.style.display = 'none';

    if (view === 'historial') {
      historialContainer.style.display = 'flex';
      renderizarHistorial();
    } else if (view === 'main') {
      mainContent.style.display = 'block';
    } else if (view === 'buscar') {
      buscarContainer.style.display = 'flex';
      document.getElementById('searchInput').value = '';
      document.getElementById('searchResults').innerHTML = '';
      document.getElementById('searchInput').focus(); 
    }
  }

  function buscarProducto() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const searchResultsDiv = document.getElementById('searchResults');
    searchResultsDiv.innerHTML = '';

    if (searchTerm.length < 2) {
        searchResultsDiv.innerHTML = '<p>Escribe al menos 2 letras para buscar.</p>';
        return;
    }

    const listasGuardadas = JSON.parse(localStorage.getItem('listasSuper')) || [];
    let resultsFound = false;

    // Recorre cada lista guardada
    listasGuardadas.forEach(lista => {
        // Recorre cada producto dentro de la lista
        lista.productos.forEach(producto => {
            if (producto.nombre.toLowerCase().includes(searchTerm)) {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                resultItem.innerHTML = `
                    <p><strong>${producto.nombre}</strong> - $${formatNumberForDisplay(producto.precioCalculado)}</p>
                    <p>Lista del: ${lista.fechaHora}</p>
                `;
                searchResultsDiv.appendChild(resultItem);
                resultsFound = true;
            }
        });
    });

    if (!resultsFound) {
        searchResultsDiv.innerHTML = '<p>No se encontraron productos con ese nombre en el historial.</p>';
    }
  }

  // Event listener para la búsqueda en tiempo real
  document.addEventListener('DOMContentLoaded', () => {
      cargarListaActualDesdeLocalStorage();
      document.getElementById('searchInput').addEventListener('input', buscarProducto);
  });