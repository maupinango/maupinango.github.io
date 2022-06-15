function agregar(tipo)
{
    let tipoTextArea;
    let tipoSelect;

    if(tipo == 'juveniles')
    {
        tipoTextArea = '#listaJuveniles';
        tipoSelect = '#juveniles option:checked';
    }
    else
    {
        tipoTextArea = '#listaLideres';
        tipoSelect = '#lideres option:checked'; 
    }

    let contenedor = document.querySelector(tipoTextArea);
    let listaAntigua = contenedor.value;
    let array = document.querySelectorAll(tipoSelect);
    
    for(let i = 0; i < array.length; i++)
    {
        if(!existe(listaAntigua, array[i].innerHTML))
        {
            if(listaAntigua != '')
                listaAntigua += '\n';

            listaAntigua += array[i].innerHTML;
        }
    }

    contenedor.value = listaAntigua;
}

function existe(lista, persona)
{
    let datos = lista.split('\n');

    for(let i = 0; i < datos.length; i++)
        if(datos[i] == persona)
            return true;
    
    return false;
}

function distribuir()
{
    let lideres = document.querySelector('#listaLideres').value;
    let juveniles = document.querySelector('#listaJuveniles').value;
    let equipos = document.querySelector('#equipos');

    let distibucion = '';
    
    if(lideres != '')
    {
        if(juveniles != '')
        {
            let arrayLideres = lideres.split('\n');
            let arrayJuveniles = juveniles.split('\n');
            let cantMax = Math.floor(arrayJuveniles.length / arrayLideres.length);
            let cantFaltante = arrayJuveniles.length % arrayLideres.length;
            let j = 0;

            arrayJuveniles.sort(function() {return Math.random() - 0.5});
            
            for(let i = 0; i < arrayLideres.length; i++)
            {
                distibucion += (i+1) + ') ' + arrayLideres[i] + ': \n';
                let cant = 0;

                for(;j < arrayJuveniles.length && cant < cantMax; j++)
                {
                    distibucion += arrayJuveniles[j] + '\n';
                    cant++;

                    if(cantFaltante > 0)
                    {
                        j++;
                        distibucion += arrayJuveniles[j] + '\n';
                        cantFaltante--;
                    }
                }

                distibucion += '\n';
            }

            equipos.value = distibucion;
        }
        else
        {
            alert('Debe ingresar juveniles');
        }
    }
    else
    {
        alert('Debe ingresar líderes');
    }
}