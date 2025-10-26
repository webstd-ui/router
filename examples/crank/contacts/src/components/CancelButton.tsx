export function CancelButton() {
    return (
        <button onclick={() => history.back()} type="button">
            Cancel
        </button>
    );
}
