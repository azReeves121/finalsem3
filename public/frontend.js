const socket = new WebSocket("ws://localhost:3000/ws");

socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  if (data.event === "new_poll") {
    onNewPollAdded(data.poll);
  } else if (data.event === "vote_update") {
    onIncomingVote(data.poll);
  }
});

function onNewPollAdded(data) {
  const pollContainer = document.getElementById("polls");

  const newPoll = document.createElement("li");
  newPoll.classList.add("poll-container");
  newPoll.id = data._id;

  newPoll.innerHTML = `
        <h2>${data.question}</h2>
        <ul class="poll-options">
            ${data.options
              .map(
                (option) =>
                  `<li id="${data._id}_${option.answer}">
                    <strong>${option.answer}:</strong> <span class="vote-count">${option.votes}</span> votes
                </li>`
              )
              .join("")}
        </ul>
        <form class="poll-form button-container">
            ${data.options
              .map(
                (option) =>
                  `<button type="submit" class="action-button vote-button" value="${option.answer}" name="poll-option">
                    Vote for ${option.answer}
                </button>`
              )
              .join("")}
            <input type="hidden" name="poll-id" value="${data._id}">
        </form>
    `;

  pollContainer.appendChild(newPoll);

  newPoll.querySelector(".poll-form").addEventListener("submit", onVoteClicked);
}

function onIncomingVote(data) {
  data.options.forEach((option) => {
    const optionElement = document.getElementById(
      `${data._id}_${option.answer}`
    );
    if (optionElement) {
      optionElement.querySelector(".vote-count").textContent = option.votes;
    }
  });
}

function onVoteClicked(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const pollId = formData.get("poll-id");
  const selectedOption = event.submitter.value;

  const voteData = {
    event: "new_vote",
    pollId: pollId,
    option: selectedOption,
  };
  socket.send(JSON.stringify(voteData));
}

document.querySelectorAll(".poll-form").forEach((pollForm) => {
  pollForm.addEventListener("submit", onVoteClicked);
});
