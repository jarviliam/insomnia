import React, { PureComponent } from 'react';
import Papa from 'papaparse';
import { autoBindMethodsForReact } from 'class-autobind-decorator';
import { AUTOBIND_CFG } from '../../../common/constants';

interface Props {
  body: Buffer;
}

interface State {
  result: null | {
    data: string[][];
  };
}

@autoBindMethodsForReact(AUTOBIND_CFG)
class ResponseCSVViewer extends PureComponent<Props, State> {
  state: State = {
    result: null,
  }

  currentHash = '';

  update(body: Buffer) {
    const csv = body.toString('utf8');
    Papa.parse<string[]>(csv, {
      skipEmptyLines: true,
      complete: result => {
        this.setState({ result });
      },
    });
  }

  componentDidMount() {
    this.update(this.props.body);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillUpdate(nextProps: Props) {
    if (this.props.body === nextProps.body) {
      return;
    }

    this.update(nextProps.body);
  }

  render() {
    const { result } = this.state;

    if (!result) {
      return 'Parsing CSV...';
    }

    return (
      <div className="pad-sm">
        <table className="table--fancy table--striped table--compact selectable">
          <tbody>
            {result.data.map(row => (
              <tr>
                {row.map(c => (
                  <td>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}

export default ResponseCSVViewer;
