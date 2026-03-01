document.addEventListener("DOMContentLoaded", function(){

  // LOAD HEADER
  fetch("layout/userNavigation.html")
  .then(res => res.text())
  .then(data => {

    document.getElementById("nav-placeholder").innerHTML = data;

    setupAuthButton(); // important
  });


  // LOAD FOOTER
  fetch("layout/userFooter.html")
  .then(res => res.text())
  .then(data => {

    document.getElementById("footer-placeholder").innerHTML = data;

  });

});


/* AUTH BUTTON LOGIC */

function setupAuthButton(){

  const authBtn = document.getElementById("authBtn");

  const session =
    JSON.parse(localStorage.getItem("loggedInUser"));

  if(session){

    authBtn.innerHTML =
      '<i class="fa-solid fa-right-from-bracket"></i> Logout';

    authBtn.onclick = function(){

      localStorage.clear();

      alert("Logged out successfully");

      window.location.href =
        "../index.html";

    };

  }

  else{

    authBtn.innerHTML =
      '<i class="fa-solid fa-user"></i> Login';

    authBtn.onclick = function(){

      window.location.href =
        "../Login.html";

    };

  }

}