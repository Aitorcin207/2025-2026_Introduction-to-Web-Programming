console.log("Functions file loaded");
// Function to add two numbers
function sum (a, b) {
    return a + b;
}

console.log(sum(3, 5));

function sum2 (a, b) {
    return a + b;
}

console.log(sum2(5, 3));

setTimeout(function() {
    console.log("2 seconds have pass...")
    console.log(sum(10, 20));
}, 2000);

let sum3 = (a, b) => a + b;
let square = x => x * x;
let giveMeFive = () => 5;

let LargerFunction = (a, b, c) => {
    let dothings = a + b / c;
    return dothings;
}

console.log(giveMeFive());

console.log(sum3(4, 9));
console.log(square(5));

let button = document.getElementById("btn");

button.addEventListener("click", () => {
    console.log(sum3(7, 8));
    hello("Aitor");
    // console.log("You clicked the button.");
});

function hello(nombre) {
    console.log("Hello " + nombre);
}

const letters = ["a", "b", "c", "d"];
const numbers = [1, 2, 3, 4];

let squarNumbers = numbers.map(n => n*n); // makes a new array
console.log(squarNumbers);

let age = 13;
let age2 = 33;
let isAdult = age >= 18 ? true : false;
let isAdult2 = age2 >= 18 && true;
console.log(isAdult);
console.log(isAdult2);


function takenumbers (x,y,z,w) {
    return x + y + z + w;
}
console.log(takenumbers(... numbers)); // spread operator  ----> los ... hace que coja los elementos del array y los ponga como argumentos individuales

function printEverything(...thingsToPrint) { // rest operator  ----> los ... hace que coja todos los argumentos y los ponga en un array
    thingsToPrint.forEach(x => {
        console.log(x)
        }
    )
}
printEverything("hello", 3, true, "Aitor", 5, 7, "bye", [1, 5, 6, 8, 9], {dtat: 5}, letters);

let a = 0; 
let b = null;
let c = "text";

console.log(a && c);
console.log(a || c);
console.log(a ?? c);

console.log(b && c);
console.log(b || c);
console.log(b ?? c);

console.log(a && b);
console.log(a || b);
console.log(a ?? b);

console.log(c && a);
console.log(c || a);
console.log(c ?? a);

let data = {
    name: "Aitor",
    age: 21,
    adress: {
        country: "Spain",
        street: "Calle Falsa 123",
        code: 28080,
        city: {
            name: "Madrid",
            status: "ALIVE"
        }
    }
}

function GetInformation() {
    if(data && data.adress && data.adresss.city) {
        console.log(data.adress.city.name);
    } 
    else {
        console.log("City not found");
    }
}

console.log(data?.adress?.city?.name); // optional chaining
GetInformation();