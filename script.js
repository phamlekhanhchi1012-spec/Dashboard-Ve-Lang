async function loadDashboard() {
  try {
    const response = await fetch('data.json');
    const data = await response.json();

    const container = document.getElementById('content');
    container.innerHTML = '';

    data.forEach(item => {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `<h2>${item.title}</h2><p>${item.description}</p>`;
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  }
}

loadDashboard();
// ===============================
// LANGHOOD DASHBOARD
// ===============================

// Last Updated
const updateText = document.querySelector("header p");

if(updateText){

    const today = new Date();

    const options = {
        day: "2-digit",
        month: "short",
        year: "numeric"
    };

    updateText.innerHTML =
        "Last updated: " +
        today.toLocaleDateString("en-GB", options);

}



// ===============================
// SIDEBAR ACTIVE
// ===============================

const menuItems = document.querySelectorAll(".sidebar nav a");

menuItems.forEach(item=>{

    item.addEventListener("click",(e)=>{

        e.preventDefault();

        menuItems.forEach(link=>{
            link.classList.remove("active");
        });

        item.classList.add("active");

    });

});



// ===============================
// DARK MODE
// ===============================

const darkBtn = document.querySelector("header button");

darkBtn.addEventListener("click",()=>{

    document.body.classList.toggle("dark");

});



// ===============================
// DATA.JSON
// (Coming Soon)
// ===============================

// fetch("data.json")
// .then(res=>res.json())
// .then(data=>{
//
//     console.log(data);
//
// });