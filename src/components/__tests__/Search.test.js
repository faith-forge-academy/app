import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import axios from 'axios';
import Search from '../Search';
import rootReducer from '../../reducers';
import history from '../../utils/history';

jest.mock('axios', () => ({
  get: jest.fn(),
}));

jest.mock('../../utils/history', () => ({
  push: jest.fn(),
}));

const JOHN_HTML = '<p class="p"><span class="v">16</span>For God so loved the world, that he gave his only born Son.</p>';

function renderSearch() {
  const store = configureStore({ reducer: rootReducer });
  render(
    <Provider store={store}>
      <Search />
    </Provider>
  );
  return store;
}

describe('Search', () => {
  beforeEach(() => {
    window.localStorage.clear();
    axios.get.mockReset();
    history.push.mockReset();
  });

  it('shows the reference and the verse as separate rows', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: {
          total: 2,
          verses: [
            {
              id: 'JHN.12.25',
              bibleId: 'bible',
              reference: 'John 12:25',
              text: 'He who loves his life will lose it.',
            },
            {
              id: 'JHN.3.16',
              bibleId: 'bible',
              reference: 'John 3:16',
              text: 'For God so loved the world.',
            },
          ],
        },
      },
    });

    renderSearch();
    fireEvent.change(screen.getByLabelText('Search scripture'), { target: { value: 'love' } });

    const first = await screen.findByRole('button', { name: /John 12:25/ });
    const second = screen.getByRole('button', { name: /John 3:16/ });
    expect(first).toHaveTextContent('He who loves his life will lose it.');
    expect(second).toHaveTextContent('For God so loved the world.');
    expect(screen.getByText('2 matches')).toBeInTheDocument();
    expect(first.querySelector('mark')).toHaveTextContent('loves');
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('stores a reference lookup as plain text and opens study', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: {
          passages: [{
            id: 'JHN.3.16',
            bibleId: 'bible',
            reference: 'John 3:16',
            content: JOHN_HTML,
          }],
        },
      },
    });

    const store = renderSearch();
    fireEvent.change(screen.getByLabelText('Search scripture'), { target: { value: 'John 3:16' } });

    const choice = await screen.findByRole('button', { name: /John 3:16/ });
    expect(choice).toHaveTextContent('For God so loved the world, that he gave his only born Son.');
    expect(choice).not.toHaveTextContent('<span');

    fireEvent.click(choice);

    await waitFor(() => {
      expect(store.getState().verse).toMatchObject({
        id: 'John 3:16',
        content: 'For God so loved the world, that he gave his only born Son.',
      });
    });
    expect(JSON.parse(window.localStorage.getItem('verse')).id).toBe('John 3:16');
    expect(history.push).toHaveBeenCalledWith('/study');
  });
});
