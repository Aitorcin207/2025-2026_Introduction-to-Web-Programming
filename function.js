let btn = document.getElementById("submit-data");

btn.addEventListener("click", Add_to_table);

let table = document.getElementById("user-table");

let empty = document.getElementById("empty-table");

empty.addEventListener("click", Limpiar_tabla);

function Limpiar_tabla() {
    table.innerHTML = "<tr> <td>Username</td> <td>Email</td> <td>Admin</td> </tr>";
    }

function Add_to_table() {
    let user = document.getElementById("input-username").value;
    let email = document.getElementById("input-email").value;
    let admin = document.getElementById("input-admin").checked;

    if (user !== "" && email !== "") {
        let exists = false;
        for (let i = 1; i < table.rows.length; i++) { // start from 1 to skip header
            if (table.rows[i].cells[0].textContent === user) {
            exists = true;
            numero = i;
            }
        }
        if (exists == true) {
            table.rows[numero].cells[1].textContent = email; // update email

            if (admin == true) {
                table.rows[numero].cells[2].textContent = "X"; // update admin status
                alert("AAAAAAA");
            }
            else {
                table.rows[numero].cells[2].textContent = "-"; // update admin status
                alert("BBBBBBB");
            }
        }
        else {    
            let row = table.insertRow(-1);
            let cell1 = row.insertCell(0);
            let cell2 = row.insertCell(1);
            let cell3 = row.insertCell(2);

            cell1.textContent = user;
            cell2.textContent = email;
            if (admin == true) {
                cell3.textContent = "X";
            }
            else {
                cell3.textContent = "-";
            }
        }
    }
    else {
        if (user == "" && email == "")  {
        alert("Is required to fill username and email.");
        
        document.getElementById("input-username").value = "";
        document.getElementById("input-email").value = "";
        document.getElementById("input-admin").checked = false;
        return;

        }
        if (user == "")  {
        alert("Is required to fill username.");
        }
        if (email == "")  {
        alert("Is required to fill email.");
        }    
    }


    document.getElementById("input-username").value = "";
    document.getElementById("input-email").value = "";
    document.getElementById("input-admin").checked = false;
}