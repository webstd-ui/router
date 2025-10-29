import { App } from './app.ts';
import { CancelButton } from './custom-elements/cancel-button.ts';
import { DeleteButton } from './custom-elements/delete-button.ts';
import { Details } from './custom-elements/details.ts';
import { Favorite } from './custom-elements/favorite.ts';
import { Form, Link } from './custom-elements/router.ts';
import { SearchBar } from './custom-elements/search-bar.ts';
import { Sidebar, SidebarItem } from './custom-elements/sidebar.ts';

customElements.define(App.tag, App);

customElements.define(SearchBar.tag, SearchBar);
customElements.define(Sidebar.tag, Sidebar);
customElements.define(SidebarItem.tag, SidebarItem);
customElements.define(Favorite.tag, Favorite);
customElements.define(Details.tag, Details);
customElements.define(DeleteButton.tag, DeleteButton);
customElements.define(CancelButton.tag, CancelButton);

customElements.define(Form.tag, Form);
customElements.define(Link.tag, Link);
