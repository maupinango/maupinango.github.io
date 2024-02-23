let puntosAcum = 0;
let cantPreguntas = 1;
let n1 = 0;
let n2 = 0;
let resultado = 0;
let posBtnCorrecto = 0;
let botones = document.querySelectorAll('button[name="btnopcion"]');

const cargarSonido = function (fuente) 
{
    const sonido = document.createElement("audio");
    sonido.src = fuente;
    sonido.setAttribute("preload", "auto");
    sonido.setAttribute("controls", "none");
    sonido.style.display = "none"; 
    document.body.appendChild(sonido);
    return sonido;
};

const correcto = cargarSonido("audio/correct.mp3");
const incorrecto = cargarSonido("audio/wrong.mp3");
const final = cargarSonido("audio/final.mp3");

function practica(btnPos)
{
    if(btnPos != -1)
    {
        if(btnPos == posBtnCorrecto)
        {
            puntosAcum++;
            botones[btnPos].style.background = 'green';
            correcto.play();
        }
        else
        {
            botones[btnPos].style.background = 'red';
            incorrecto.play();
        }

        document.querySelector('#resultado').innerHTML = resultado;

        if(cantPreguntas != 21)  //20 preguntas
            setTimeout(calcular, 4000); 
        else
            setTimeout(finalizar, 4000); 
    }
    else
    {
        calcular(); 
    }
}

function finalizar()
{
    document.querySelector('#contenedor').style.display = 'none';
    document.querySelector('#puntostotales').style.display = 'block';
    document.querySelector('#total').innerHTML = puntosAcum;
    let posImg = Math.floor(Math.random() * 5) + 1;
    document.querySelector('#imagen').src = 'img/img' + posImg + '.png';
    final.play();
}

function calcular()
{
    document.querySelector('#cantPre').innerHTML = cantPreguntas;
    cantPreguntas++;

    n1 = Math.floor(Math.random() * 99) + 1;
    n2 = Math.floor(Math.random() * 99) + 1;
    resultado = n1 + n2;

    document.querySelector('#n1').innerHTML = n1;
    document.querySelector('#n2').innerHTML = n2;
    document.querySelector('#resultado').innerHTML = '?';

    posBtnCorrecto = Math.floor(Math.random() * 6);
    let variante = 1;

    for(let i = 0; i < botones.length; i++)
    {
        botones[i].style.background = '#f0f0f0';

        if(i == posBtnCorrecto)
        {
            botones[i].innerHTML = resultado;
        }
        else
        {
            let sumaResta = Math.floor(Math.random() * 2) + 1;

            if(sumaResta == 1) //incrementa
                botones[i].innerHTML = resultado + variante;
            else //decrementa
                botones[i].innerHTML = resultado - variante;

            variante++;
        }
    }
}

function reset()
{
    window.location.reload();
}

practica(-1);